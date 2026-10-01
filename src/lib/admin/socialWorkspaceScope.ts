import 'server-only'
import { cache } from 'react'
import { supabaseServer } from '@/src/lib/supabase/server'
import { getCurrentAdmin, hasPermission } from './auth'
import type { SocialWorkspaceRole } from '@/src/types/social'

/**
 * Relational authorization layer for Social Workspaces — adapted from
 * src/lib/admin/workScope.ts's pattern, NOT copied blindly. The one
 * deliberate structural difference from Work: there is no `seesAll`
 * field here at all. Work's Owner can legitimately see every team's
 * tasks company-wide; Social Workspace content (DMs, automation rules,
 * analytics) is private operational data a Founder has no automatic
 * right to, per the Social Media Multi-Workspace Audit §21. A global
 * `canManageWorkspaces` flag exists for workspace/membership
 * ADMINISTRATION only (create workspace, manage any workspace's
 * members, suspend) — it must NEVER be consulted by a content
 * read/write check. If you find yourself writing
 * `if (scope.canManageWorkspaces) return true` inside a content-access
 * function, that's the bug this file exists to prevent.
 */
export interface SocialWorkspaceScope {
  /** admin_users.id of the current admin — not the Supabase auth user id. */
  adminUserId: string
  /** social:manage_workspaces — create workspaces, manage ANY workspace's
   * membership, suspend. Deliberately disjoint from content access. */
  canManageWorkspaces: boolean
  /** Every workspace this admin has an actual membership row for, any
   * role — the ONLY basis for reading that workspace's content,
   * analytics, or automation data. */
  memberWorkspaceIds: string[]
  /** workspace_role = 'owner' — can manage THIS workspace's own
   * membership, independent of the global canManageWorkspaces flag. */
  ownerWorkspaceIds: string[]
  /** workspace_role in ('owner', 'manager') — can create/edit/delete
   * content and automation rules, connect/reconnect/disconnect accounts. */
  writableWorkspaceIds: string[]
}

/**
 * Resolves the current request's Social Workspace scope, or null if this
 * admin has no Social access at all (missing social:read_own). Cached
 * per request (React cache(), same pattern as getCurrentAdmin/
 * getWorkScope) so multiple route/page calls in one request only query
 * social_workspace_members once.
 */
export const getSocialWorkspaceScope = cache(async function getSocialWorkspaceScope(): Promise<SocialWorkspaceScope | null> {
  const admin = await getCurrentAdmin()
  if (!admin || !hasPermission(admin, 'social:read_own')) return null

  const { data: adminRow, error: adminRowError } = await supabaseServer
    .from('admin_users')
    .select('id')
    .eq('user_id', admin.user.id)
    .maybeSingle()

  if (adminRowError || !adminRow) {
    console.error('[getSocialWorkspaceScope] Failed to resolve admin_users.id', adminRowError?.message)
    return null
  }

  const adminUserId = adminRow.id
  const canManageWorkspaces = hasPermission(admin, 'social:manage_workspaces')

  const { data: memberships, error: membershipsError } = await supabaseServer
    .from('social_workspace_members')
    .select('workspace_id, workspace_role')
    .eq('admin_user_id', adminUserId)

  if (membershipsError) {
    console.error('[getSocialWorkspaceScope] Failed to load workspace memberships', membershipsError.message)
  }

  const rows = (memberships || []) as { workspace_id: string; workspace_role: SocialWorkspaceRole }[]
  return {
    adminUserId,
    canManageWorkspaces,
    memberWorkspaceIds: rows.map((r) => r.workspace_id),
    ownerWorkspaceIds: rows.filter((r) => r.workspace_role === 'owner').map((r) => r.workspace_id),
    writableWorkspaceIds: rows.filter((r) => r.workspace_role === 'owner' || r.workspace_role === 'manager').map((r) => r.workspace_id),
  }
})

/** Can this scope read a workspace's content/analytics/automation data
 * at all — requires an actual membership row, any role. This is the
 * function every content-scoping route must call; it is intentionally
 * incapable of returning true from canManageWorkspaces alone. */
export function canReadWorkspace(scope: SocialWorkspaceScope, workspaceId: string): boolean {
  return scope.memberWorkspaceIds.includes(workspaceId)
}

/** Alias kept distinct from canReadWorkspace for call-site clarity —
 * "can this scope open/see this workspace exists" vs "can it read the
 * content inside," which happen to be the same check today (both are
 * membership-gated) but are conceptually different questions that could
 * diverge later (e.g. a workspace directory visible to canManageWorkspaces
 * holders without content access). */
export function canAccessWorkspace(scope: SocialWorkspaceScope, workspaceId: string): boolean {
  return canReadWorkspace(scope, workspaceId)
}

/** Can this scope create/edit/delete content, automation rules, or
 * connected accounts within this workspace — owner/manager only. */
export function canWriteWorkspace(scope: SocialWorkspaceScope, workspaceId: string): boolean {
  return scope.writableWorkspaceIds.includes(workspaceId)
}

/** Can this scope add/remove members or change workspace_role within
 * THIS workspace — the workspace's own owner, OR the global
 * social:manage_workspaces permission (Founder-level administration).
 * Still never grants content access by itself. */
export function canManageWorkspaceMembers(scope: SocialWorkspaceScope, workspaceId: string): boolean {
  if (scope.canManageWorkspaces) return true
  return scope.ownerWorkspaceIds.includes(workspaceId)
}

/** Can this scope connect/reconnect/disconnect a connected account
 * within this workspace — owner/manager only, same boundary as content
 * writes (connecting an account is an operational action, not a
 * membership action). */
export function canManageConnectedAccount(scope: SocialWorkspaceScope, workspaceId: string): boolean {
  return canWriteWorkspace(scope, workspaceId)
}

/** Can this scope read analytics/content/automation-run history —
 * any member role (owner/manager/analyst). */
export function canReadAnalytics(scope: SocialWorkspaceScope, workspaceId: string): boolean {
  return canReadWorkspace(scope, workspaceId)
}

/** Can this scope create/edit/delete automation rules — owner/manager
 * only; an analyst can still read rules/runs via canReadWorkspace. */
export function canManageAutomations(scope: SocialWorkspaceScope, workspaceId: string): boolean {
  return canWriteWorkspace(scope, workspaceId)
}

/** Creating a brand-new workspace is deliberately NOT owner-of-an-
 * existing-workspace-delegable — only social:manage_workspaces. */
export function canCreateWorkspace(scope: SocialWorkspaceScope): boolean {
  return scope.canManageWorkspaces
}

/**
 * Resolves the one workspace a create (POST) operation should default
 * to, for the current UI which has no workspace selector yet (see the
 * Social Media Multi-Workspace Audit §22 — deferred to a later phase).
 * Returns an error rather than guessing if the caller belongs to zero or
 * more than one writable workspace — this function is what keeps that
 * future multi-workspace case from silently picking the wrong one;
 * every call site already returns its `error` as a 400, never falls
 * back to "pick the first."
 */
/**
 * TRANSITIONAL — remove once the one-time connected-account backfill
 * (src/lib/social/backfillWorkspace.ts) has actually run in an
 * environment with INSTAGRAM_BUSINESS_ACCOUNT_ID configured (see the
 * Social Workspace Foundation implementation report §14). Until then,
 * ig_automation_rules/ig_automation_runs rows pre-dating this migration
 * still have connected_account_id = NULL — not yet claimed by any
 * connected account.
 *
 * Narrowly scoped on purpose: returns true only when the caller is a
 * writable member of EXACTLY ONE workspace, which is the one case where
 * "this NULL legacy row belongs to them" is unambiguous (today's real
 * state — one workspace, one owner). The moment a second workspace
 * exists for this admin, or they belong to zero/multiple, this returns
 * false and legacy NULL rows simply stop being visible rather than
 * risking exposure across an ambiguous situation — fails closed, never
 * open. Once the backfill runs, every existing row gets a real
 * connected_account_id and this function becomes permanently false for
 * everyone (nothing left to fall back to), so it's safe to delete then.
 */
export function canAccessLegacyUnmigratedAutomationData(scope: SocialWorkspaceScope): boolean {
  return scope.writableWorkspaceIds.length === 1
}

export function resolveDefaultWritableWorkspaceId(scope: SocialWorkspaceScope): { ok: true; workspaceId: string } | { ok: false; error: string } {
  if (scope.writableWorkspaceIds.length === 0) {
    return { ok: false, error: 'You are not an owner or manager of any Social Workspace' }
  }
  if (scope.writableWorkspaceIds.length > 1) {
    return { ok: false, error: 'Multiple Social Workspaces available — a workspace must be specified explicitly' }
  }
  return { ok: true, workspaceId: scope.writableWorkspaceIds[0] }
}
