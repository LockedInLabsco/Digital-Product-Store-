import 'server-only'
import { cache } from 'react'
import { supabaseServer } from '@/src/lib/supabase/server'
import { getSupabaseUser } from '@/src/lib/supabase/auth'
import { permissionsForRoles } from './permissions'
import type { AdminPermission, AdminRole, AdminStatus, CurrentAdmin } from '@/src/types/admin'

interface AdminUserRow {
  id: string
  user_id: string
  email: string
  roles: AdminRole[]
  status: AdminStatus
  invited_by: string | null
}

function toCurrentAdmin(row: AdminUserRow): CurrentAdmin {
  return {
    user: { id: row.user_id, email: row.email },
    roles: row.roles,
    permissions: permissionsForRoles(row.roles),
  }
}

/**
 * Resolves the full admin identity + authorization for the current
 * request: is there a Supabase Auth session, and does that user have an
 * active admin_users membership? Cached per request (React's cache(),
 * same pattern already used by getPublicWaitlistBySlug in
 * lib/supabase/waitlists.ts) so a layout and a page can both call this
 * without doubling the database round trip.
 *
 * Also handles the two ways a brand-new Supabase user becomes an admin —
 * see the bootstrap-owner and invite-acceptance branches below — so
 * every other admin code path only ever has to ask "is this an admin,
 * yes or no" via requireAdmin()/requirePermission().
 */
export const getCurrentAdmin = cache(async function getCurrentAdmin(): Promise<CurrentAdmin | null> {
  const user = await getSupabaseUser()
  if (!user || !user.email) return null

  const email = user.email.toLowerCase()

  const { data: existing, error: lookupError } = await supabaseServer
    .from('admin_users')
    .select('id, user_id, email, roles, status, invited_by')
    .eq('user_id', user.id)
    .maybeSingle()

  if (lookupError) {
    console.error('[getCurrentAdmin] Failed to look up admin_users row', lookupError.message)
    return null
  }

  if (existing) {
    return existing.status === 'active' ? toCurrentAdmin(existing as AdminUserRow) : null
  }

  // No membership yet — this Supabase account has never been an admin
  // before. Exactly two ways that's allowed to change automatically,
  // both requiring something only the site operator controls (an env
  // var) or something only a current admin can have created (an
  // invite) — never "first person to log in."

  // 1. Bootstrap: promotes ONLY the exact email configured by the site
  // operator, and only once (after which this branch never matches
  // again for that user, since step 1 above finds their row). See
  // docs/ADMIN_AUTH_SETUP.md for how to use and then remove this.
  const bootstrapEmail = process.env.ADMIN_BOOTSTRAP_OWNER_EMAIL?.trim().toLowerCase()
  if (bootstrapEmail && bootstrapEmail === email) {
    const { data: created, error: insertError } = await supabaseServer
      .from('admin_users')
      .insert({ user_id: user.id, email, roles: ['owner'], status: 'active', invited_by: null })
      .select('id, user_id, email, roles, status, invited_by')
      .maybeSingle()

    if (created) return toCurrentAdmin(created as AdminUserRow)

    // Insert can race (e.g. two requests hitting this branch at once) —
    // the unique constraint on user_id makes the loser's insert fail,
    // so re-read rather than treat that as "not an admin."
    if (insertError) {
      const { data: retry } = await supabaseServer
        .from('admin_users')
        .select('id, user_id, email, roles, status, invited_by')
        .eq('user_id', user.id)
        .maybeSingle()
      if (retry) return retry.status === 'active' ? toCurrentAdmin(retry as AdminUserRow) : null
    }
  }

  // 2. Invite acceptance: this is the first time an invited email has
  // successfully authenticated — convert the pending invite into real
  // membership. Emails are stored lowercased at invite-creation time
  // (see /api/admin/team route), matched with a plain equality check
  // (never a pattern match) so an email containing % or _ can't widen
  // the match.
  const { data: invite } = await supabaseServer
    .from('admin_invites')
    .select('id, email, roles, invited_by')
    .eq('status', 'pending')
    .eq('email', email)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (invite) {
    const { data: created } = await supabaseServer
      .from('admin_users')
      .insert({ user_id: user.id, email, roles: invite.roles, status: 'active', invited_by: invite.invited_by })
      .select('id, user_id, email, roles, status, invited_by')
      .maybeSingle()

    if (created) {
      await supabaseServer.from('admin_invites').update({ status: 'accepted' }).eq('id', invite.id)
      await acceptPendingSocialWorkspaceInvites(created.id, email)
      return toCurrentAdmin(created as AdminUserRow)
    }
  }

  return null
})

/**
 * Converts every pending Social Workspace invite for this email (see
 * supabase/migrations/0028_social_workspace_invites.sql and
 * src/app/api/admin/social/workspaces/[id]/members/route.ts, the only
 * place rows here are created) into a real social_workspace_members row,
 * the moment this admin_users identity first exists — whether that's
 * via a brand-new site-wide admin_invites acceptance (this function's
 * only caller today) or, in the future, any other path that creates an
 * admin_users row for an email with workspace invites waiting on it.
 *
 * Deliberately NOT inside the same transaction as the admin_users
 * insert above — Supabase's JS client has no cross-table transaction
 * here, same constraint every other insert in this file already lives
 * with. Failure here is non-fatal to login: the admin_users row is the
 * part that actually matters for auth; a missed workspace membership
 * leaves the admin simply without that workspace until they're
 * re-invited or added directly, never signed out or blocked.
 */
async function acceptPendingSocialWorkspaceInvites(adminUserId: string, email: string): Promise<void> {
  const { data: invites, error: invitesError } = await supabaseServer
    .from('social_workspace_invites')
    .select('id, workspace_id, workspace_role')
    .eq('status', 'pending')
    .eq('email', email)
    .gt('expires_at', new Date().toISOString())

  if (invitesError) {
    console.error('[getCurrentAdmin] Failed to look up pending workspace invites', invitesError.message)
    return
  }
  if (!invites || invites.length === 0) return

  for (const invite of invites) {
    const { error: memberError } = await supabaseServer
      .from('social_workspace_members')
      .insert({ workspace_id: invite.workspace_id, admin_user_id: adminUserId, workspace_role: invite.workspace_role })

    // 23505 = already a member of that workspace somehow (e.g. a second
    // invite accepted twice) — the invite is still marked accepted below
    // either way, since the end state (a real membership row) is already
    // true.
    if (memberError && memberError.code !== '23505') {
      console.error('[getCurrentAdmin] Failed to create workspace membership from invite', memberError.message)
      continue
    }

    await supabaseServer.from('social_workspace_invites').update({ status: 'accepted' }).eq('id', invite.id)
  }
}

export function hasPermission(admin: CurrentAdmin | null, permission: AdminPermission): boolean {
  return admin?.permissions.includes(permission) ?? false
}

export type AdminAuthResult =
  | { ok: true; admin: CurrentAdmin }
  | { ok: false; status: 401; error: string }
  | { ok: false; status: 403; error: string }

/** For API routes: any active admin, regardless of specific permission. */
export async function requireAdmin(): Promise<AdminAuthResult> {
  const admin = await getCurrentAdmin()
  if (!admin) {
    const user = await getSupabaseUser()
    return user
      ? { ok: false, status: 403, error: 'Forbidden' }
      : { ok: false, status: 401, error: 'Unauthorized' }
  }
  return { ok: true, admin }
}

/** For API routes: an active admin who also has the given permission. */
export async function requirePermission(permission: AdminPermission): Promise<AdminAuthResult> {
  const result = await requireAdmin()
  if (!result.ok) return result
  if (!hasPermission(result.admin, permission)) {
    return { ok: false, status: 403, error: 'Forbidden' }
  }
  return result
}
