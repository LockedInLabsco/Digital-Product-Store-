/**
 * provisionOwnWorkspace: self-service provisioning of ONE deterministically-
 * named Social Workspace for a given admin — the original fix for the
 * now-retired "every admin needs a workspace to use Instagram Connect at
 * all" bootstrapping gap. Superseded in production routes by the
 * explicit "Create workspace" flow (createSocialWorkspace below, called
 * from src/app/api/admin/social/workspaces/route.ts) once the Social
 * Media Multi-Workspace Audit moved this app off the one-admin-one-
 * workspace assumption entirely — see
 * src/lib/admin/activeSocialWorkspace.ts. Kept (with its tests) as a
 * reviewed, working utility rather than deleted outright; it has no
 * remaining caller in application code.
 *
 * Deliberately separate from src/lib/social/backfillWorkspace.ts, which
 * is the one-time migration of the single ORIGINAL global dataset into
 * one hardcoded, owner-only workspace.
 *
 * Never trusts a caller-supplied admin_user_id/workspace_id — both
 * exported functions below require the caller to already have resolved
 * the CURRENTLY authenticated admin's own identity server-side, never
 * anything from the request body/query/params.
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

export type CreateSocialWorkspaceResult = { ok: true; workspaceId: string } | { ok: false; error: string }

/**
 * Explicit, user-named workspace creation — the "Create workspace"
 * action in the workspace switcher (see
 * src/app/api/admin/social/workspaces/route.ts, the only caller). Unlike
 * provisionOwnWorkspace above, this ALWAYS creates a brand-new workspace
 * (never dedupes/reuses an existing one by name) and is callable
 * regardless of how many workspaces the admin already belongs to — an
 * admin legitimately running several brands (Personal Brand, a client
 * account, …) must be able to add another one at any time, not just
 * once while they have zero memberships.
 *
 * Name collisions are reported as a normal validation error (the admin
 * picked a name already in use by ANY workspace, not just their own —
 * social_workspaces.name is globally unique, matching the one-Instagram-
 * account-one-workspace philosophy of never silently merging two
 * same-named things), not treated as "reuse the existing one" the way
 * provisionOwnWorkspace's own deterministic-name race handling does.
 */
export async function createSocialWorkspace(adminUserId: string, name: string): Promise<CreateSocialWorkspaceResult> {
  const trimmedName = name.trim()
  if (!trimmedName) {
    return { ok: false, error: 'Workspace name is required' }
  }

  const { data: created, error: insertError } = await supabaseServer
    .from('social_workspaces')
    .insert({ name: trimmedName, created_by: adminUserId })
    .select('id')
    .single()

  if (insertError) {
    if (insertError.code === UNIQUE_VIOLATION) {
      return { ok: false, error: 'A workspace with that name already exists' }
    }
    console.error('[Create Workspace] Failed to create workspace', insertError.message)
    return { ok: false, error: 'Failed to create workspace' }
  }

  const { error: memberError } = await supabaseServer
    .from('social_workspace_members')
    .insert({ workspace_id: created.id, admin_user_id: adminUserId, workspace_role: 'owner' })

  if (memberError) {
    console.error('[Create Workspace] Failed to create workspace membership', memberError.message)
    return { ok: false, error: 'Created the workspace but failed to add your membership — contact support' }
  }

  return { ok: true, workspaceId: created.id }
}
