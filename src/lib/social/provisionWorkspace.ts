/**
 * Self-service provisioning of ONE Social Workspace for an admin who
 * currently has zero social_workspace_members rows — the missing piece
 * identified after the Instagram Connect flow shipped: a brand-new (or
 * pre-existing) social_media admin has personal_brand:write but no
 * workspace membership at all, so resolveDefaultWritableWorkspaceId()
 * correctly fails closed with "not an owner or manager of any Social
 * Workspace" and nothing downstream (Instagram status/connect, content,
 * automations) can ever resolve a workspace for them.
 *
 * Deliberately separate from src/lib/social/backfillWorkspace.ts, which
 * is the one-time migration of the single ORIGINAL global dataset into
 * one hardcoded, owner-only workspace — this file creates a NEW, empty
 * workspace for whichever admin calls it, every time it's genuinely
 * needed, and is safe to call repeatedly (idempotent, see below).
 *
 * Never trusts a caller-supplied admin_user_id/workspace_id — see
 * src/lib/social/ensureSocialWorkspace.ts, which is the only caller and
 * always passes the CURRENTLY authenticated admin's own resolved
 * identity (scope.adminUserId, admin.user.email), never anything from
 * the request body/query/params.
 */
import 'server-only'
import { supabaseServer } from '@/src/lib/supabase/server'

const UNIQUE_VIOLATION = '23505'

export interface ProvisionedWorkspace {
  workspaceId: string
  /** false if a concurrent/duplicate call had already created this
   * exact admin's workspace (or membership) first — see the race notes
   * below. Either way the caller gets back a valid, usable workspace id. */
  created: boolean
}

export type ProvisionOwnWorkspaceResult = { ok: true; workspace: ProvisionedWorkspace } | { ok: false; error: string }

/**
 * Creates (or, if one already exists for this exact admin, reuses) a
 * workspace named deterministically from the admin's own email, and
 * makes them its 'owner' — workspace_role='owner' here means owner of
 * THIS workspace only (see canManageWorkspaceMembers/canWriteWorkspace
 * in socialWorkspaceScope.ts): no admin_users.roles change, no site-wide
 * permission grant, nothing visible outside social_workspace_members.
 *
 * Race-safety: the workspace name is deterministic per admin email, and
 * social_workspaces already enforces unique(lower(name)) (migration
 * 0025) — two concurrent calls for the SAME admin collide on that index
 * (23505), and the loser simply looks up and reuses the winner's row
 * instead of creating a second workspace. The membership insert is
 * protected the same way by social_workspace_members_unique
 * (workspace_id, admin_user_id). Two DIFFERENT admins can never collide
 * with each other here, since the name embeds their own email.
 */
export async function provisionOwnWorkspace(adminUserId: string, adminEmail: string): Promise<ProvisionOwnWorkspaceResult> {
  const name = `${adminEmail} Social Workspace`

  const { data: created, error: insertError } = await supabaseServer
    .from('social_workspaces')
    .insert({ name, created_by: adminUserId })
    .select('id')
    .single()

  let workspaceId: string
  let workspaceCreated: boolean

  if (insertError) {
    if (insertError.code !== UNIQUE_VIOLATION) {
      console.error('[Provision Workspace] Failed to create workspace', insertError.message)
      return { ok: false, error: 'Failed to create your Social Workspace' }
    }

    const { data: existing, error: lookupError } = await supabaseServer
      .from('social_workspaces')
      .select('id')
      .ilike('name', name)
      .maybeSingle()

    if (lookupError || !existing) {
      console.error('[Provision Workspace] Failed to look up workspace after name conflict', lookupError?.message)
      return { ok: false, error: 'Failed to create your Social Workspace' }
    }

    workspaceId = existing.id
    workspaceCreated = false
  } else {
    workspaceId = created.id
    workspaceCreated = true
  }

  const { error: memberError } = await supabaseServer
    .from('social_workspace_members')
    .insert({ workspace_id: workspaceId, admin_user_id: adminUserId, workspace_role: 'owner' })

  if (memberError && memberError.code !== UNIQUE_VIOLATION) {
    console.error('[Provision Workspace] Failed to create workspace membership', memberError.message)
    return { ok: false, error: 'Created your Social Workspace but failed to add your membership — try again' }
  }

  return { ok: true, workspace: { workspaceId, created: workspaceCreated } }
}
