/**
 * Request Access lifecycle — Phase F of the Social Media Multi-Workspace
 * Audit. Lets an admin who tried to connect an Instagram account already
 * owned by a different workspace (upsertConnectedInstagramAccount's
 * `already_connected_elsewhere` guard — untouched, see
 * src/lib/social/instagramConnectAccount.ts) ask that workspace's owner
 * for membership instead of hitting a dead end, WITHOUT ever duplicating
 * the connected account, its token, or transferring it.
 *
 * Every function here resolves its target workspace/connected account
 * SERVER-SIDE from something the caller cannot forge into an arbitrary
 * grant: requestWorkspaceAccess takes Meta's own external_account_id
 * (not a workspace_id — see its own doc comment), and
 * resolveAccessRequest only ever inserts a normal
 * social_workspace_members row the same way every other invite/add path
 * in this codebase does (see provisionWorkspace.ts, workspaces/[id]/members/route.ts)
 * — there is no separate "access request membership," just the one
 * membership model, same as every other phase of this audit insisted on.
 */
import 'server-only'
import { supabaseServer } from '@/src/lib/supabase/server'
import type { SocialWorkspaceAccessRequest } from '@/src/types/social'

const UNIQUE_VIOLATION = '23505'

export type RequestAccessResult =
  | { ok: true; status: 'pending'; requestId: string }
  | { ok: true; status: 'already_pending'; requestId: string }
  | { ok: true; status: 'already_member' }
  | { ok: false; reason: 'account_not_found' | 'write_failed'; error: string }

/**
 * `externalAccountId` is Meta's Instagram Business Account id — the
 * exact value the OAuth callback already resolved and handed back to
 * the browser on an already_connected_elsewhere failure (see
 * src/app/api/admin/social/instagram/connect/callback/route.ts). It is
 * NOT one of our own internal UUIDs and names no workspace by itself;
 * the owning workspace is looked up from it here, the same way
 * upsertConnectedInstagramAccount's own already_connected_elsewhere
 * check does. A caller who supplies an id that doesn't resolve to any
 * active connected account gets `account_not_found` — there is no path
 * from an arbitrary/forged id to an arbitrary workspace grant.
 */
export async function requestWorkspaceAccess(requestingAdminUserId: string, externalAccountId: string): Promise<RequestAccessResult> {
  const { data: account, error: accountError } = await supabaseServer
    .from('social_connected_accounts')
    .select('id, workspace_id')
    .eq('platform', 'instagram')
    .eq('external_account_id', externalAccountId)
    .eq('status', 'active')
    .maybeSingle()

  if (accountError) {
    console.error('[Request Access] Failed to resolve connected account', accountError.message)
    return { ok: false, reason: 'write_failed', error: 'Failed to look up this Instagram account' }
  }
  if (!account) {
    return { ok: false, reason: 'account_not_found', error: 'This Instagram account is no longer connected anywhere — try connecting again.' }
  }

  // Edge case 1 — already a member (e.g. added some other way since the
  // failed connect attempt). No request needed; nothing to approve.
  const { data: existingMembership } = await supabaseServer
    .from('social_workspace_members')
    .select('id')
    .eq('workspace_id', account.workspace_id)
    .eq('admin_user_id', requestingAdminUserId)
    .maybeSingle()

  if (existingMembership) {
    return { ok: true, status: 'already_member' }
  }

  const { data: created, error: insertError } = await supabaseServer
    .from('social_workspace_access_requests')
    .insert({ workspace_id: account.workspace_id, connected_account_id: account.id, requesting_admin_user_id: requestingAdminUserId })
    .select('id')
    .single()

  if (insertError) {
    // Edge case 2/3 — a pending request already exists (the unique
    // partial index on (workspace_id, requesting_admin_user_id) WHERE
    // status='pending'). Look it up and return it rather than erroring.
    if (insertError.code === UNIQUE_VIOLATION) {
      const { data: existingRequest } = await supabaseServer
        .from('social_workspace_access_requests')
        .select('id')
        .eq('workspace_id', account.workspace_id)
        .eq('requesting_admin_user_id', requestingAdminUserId)
        .eq('status', 'pending')
        .maybeSingle()

      if (existingRequest) {
        return { ok: true, status: 'already_pending', requestId: existingRequest.id }
      }
    }
    console.error('[Request Access] Failed to create access request', insertError.message)
    return { ok: false, reason: 'write_failed', error: 'Failed to request access' }
  }

  return { ok: true, status: 'pending', requestId: created.id }
}

export type CancelAccessRequestResult = { ok: true } | { ok: false; reason: 'not_found' | 'write_failed'; error: string }

/** The REQUESTER cancelling their own still-pending request. Scoped to
 * requestingAdminUserId so one admin can never cancel another's. */
export async function cancelAccessRequest(requestId: string, requestingAdminUserId: string): Promise<CancelAccessRequestResult> {
  const { data, error } = await supabaseServer
    .from('social_workspace_access_requests')
    .update({ status: 'cancelled' })
    .eq('id', requestId)
    .eq('requesting_admin_user_id', requestingAdminUserId)
    .eq('status', 'pending')
    .select()
    .maybeSingle()

  if (error) {
    console.error('[Request Access] Failed to cancel request', error.message)
    return { ok: false, reason: 'write_failed', error: 'Failed to cancel this request' }
  }
  if (!data) {
    return { ok: false, reason: 'not_found', error: 'No pending request found to cancel' }
  }
  return { ok: true }
}

export interface AccessRequestWithRequester extends SocialWorkspaceAccessRequest {
  requester_email: string | null
}

/** The OWNER's "Access Requests" list — pending requests for ONE
 * workspace, each with the requester's email (see
 * src/app/api/admin/social/workspaces/[id]/members/route.ts, the only
 * caller — already gated on canManageWorkspaceMembers before this runs,
 * matching the audit's "only an owner sees requester identity" rule). */
export async function listPendingAccessRequests(workspaceId: string): Promise<AccessRequestWithRequester[]> {
  const { data: requests, error } = await supabaseServer
    .from('social_workspace_access_requests')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[Request Access] Failed to list pending requests', error.message)
    return []
  }
  if (!requests || requests.length === 0) return []

  const adminUserIds = requests.map((r) => r.requesting_admin_user_id)
  const { data: admins } = await supabaseServer.from('admin_users').select('id, email').in('id', adminUserIds)
  const emailByAdminUserId: Record<string, string> = {}
  for (const admin of admins || []) emailByAdminUserId[admin.id] = admin.email

  return (requests as SocialWorkspaceAccessRequest[]).map((r) => ({ ...r, requester_email: emailByAdminUserId[r.requesting_admin_user_id] || null }))
}

export type ResolveAccessRequestResult =
  | { ok: true; status: 'approved' | 'rejected' }
  | { ok: true; status: 'already_resolved'; resolvedStatus: string }
  | { ok: false; reason: 'not_found' | 'write_failed'; error: string }

/**
 * The OWNER's approve/reject action — caller must already be verified
 * as canManageWorkspaceMembers(scope, workspaceId) by the route before
 * this is called; this function itself only re-checks that the request
 * actually belongs to workspaceId (never trusts requestId alone).
 *
 * Idempotent (CASE 3 — approving/rejecting an already-resolved request
 * is a safe no-op, never a duplicate membership or a thrown error): a
 * request not in 'pending' status is reported back as
 * `already_resolved` with its real current status, not retried.
 *
 * Approval's membership insert uses onConflict-safe semantics (23505 is
 * swallowed) because the requester may have been added some other way
 * between request creation and approval — the END STATE (a real
 * membership row with the owner's chosen role, or, if one already
 * exists, left exactly as it was) is what matters, never "did this
 * exact insert succeed."
 */
export async function resolveAccessRequest(
  workspaceId: string,
  requestId: string,
  resolverAdminUserId: string,
  decision: 'approved' | 'rejected',
  role: 'manager' | 'analyst' | null
): Promise<ResolveAccessRequestResult> {
  const { data: request, error: requestError } = await supabaseServer
    .from('social_workspace_access_requests')
    .select('id, status, requesting_admin_user_id')
    .eq('id', requestId)
    .eq('workspace_id', workspaceId)
    .maybeSingle()

  if (requestError) {
    console.error('[Request Access] Failed to load request', requestError.message)
    return { ok: false, reason: 'write_failed', error: 'Failed to load this request' }
  }
  if (!request) {
    return { ok: false, reason: 'not_found', error: 'Access request not found' }
  }
  if (request.status !== 'pending') {
    return { ok: true, status: 'already_resolved', resolvedStatus: request.status }
  }

  if (decision === 'approved') {
    if (!role) {
      return { ok: false, reason: 'write_failed', error: 'A workspace role is required to approve this request' }
    }

    const { error: memberError } = await supabaseServer
      .from('social_workspace_members')
      .insert({ workspace_id: workspaceId, admin_user_id: request.requesting_admin_user_id, workspace_role: role })

    if (memberError && memberError.code !== UNIQUE_VIOLATION) {
      console.error('[Request Access] Failed to create membership on approval', memberError.message)
      return { ok: false, reason: 'write_failed', error: 'Failed to add this member' }
    }
  }

  const { error: updateError } = await supabaseServer
    .from('social_workspace_access_requests')
    .update({
      status: decision,
      resolved_role: decision === 'approved' ? role : null,
      resolved_at: new Date().toISOString(),
      resolved_by: resolverAdminUserId,
    })
    .eq('id', requestId)
    .eq('status', 'pending')

  if (updateError) {
    console.error('[Request Access] Failed to update request status', updateError.message)
    return { ok: false, reason: 'write_failed', error: 'Membership updated, but failed to record the request outcome' }
  }

  return { ok: true, status: decision }
}
