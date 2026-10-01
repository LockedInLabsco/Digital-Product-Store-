import 'server-only'
import { cache } from 'react'
import { supabaseServer } from '@/src/lib/supabase/server'
import { getCurrentAdmin, hasPermission } from './auth'

/**
 * Relational authorization layer for the Work system, sitting ON TOP OF
 * (not instead of) the existing AdminPermission system — see the Work
 * System Phase 1 report §3/§4. `AdminPermission` answers "can this admin
 * use Work at all, and at what ceiling (own work / everything)." This
 * module answers the question that can't be a static table: "which
 * specific teams does THIS person lead or belong to right now," which is
 * what actually bounds what they can read/assign/manage. Every Work API
 * route must derive scope from here — never from a team_id/assignee_id
 * the client sent, which addresses a request but never authorizes it.
 */
export interface WorkScope {
  /** admin_users.id of the current admin — NOT the Supabase auth user id.
   * Every wk_* FK (assignee_id, created_by, admin_user_id, ...) is keyed
   * to this, same as admin_invites.invited_by already is. */
  adminUserId: string
  /** work:read_all or work:manage_all — can read every team's work. */
  seesAll: boolean
  /** work:manage_teams or work:manage_all — can create teams and manage
   * ANY team's details/membership, not just ones they lead. */
  managesAllTeams: boolean
  /** Teams this admin is 'lead' on, per wk_team_members. */
  leadsTeamIds: string[]
  /** Every team this admin belongs to at all (lead or member). */
  memberTeamIds: string[]
}

/**
 * Resolves the current request's Work authorization scope, or null if
 * this admin has no Work access at all (missing work:read_own). Cached
 * per request (React cache(), same pattern as getCurrentAdmin) so
 * multiple route/page calls in one request only query wk_team_members
 * once.
 */
export const getWorkScope = cache(async function getWorkScope(): Promise<WorkScope | null> {
  const admin = await getCurrentAdmin()
  if (!admin || !hasPermission(admin, 'work:read_own')) return null

  const { data: adminRow, error: adminRowError } = await supabaseServer
    .from('admin_users')
    .select('id')
    .eq('user_id', admin.user.id)
    .maybeSingle()

  if (adminRowError || !adminRow) {
    console.error('[getWorkScope] Failed to resolve admin_users.id', adminRowError?.message)
    return null
  }

  const adminUserId = adminRow.id
  const seesAll = hasPermission(admin, 'work:read_all') || hasPermission(admin, 'work:manage_all')
  const managesAllTeams = hasPermission(admin, 'work:manage_teams') || hasPermission(admin, 'work:manage_all')

  const { data: memberships, error: membershipsError } = await supabaseServer
    .from('wk_team_members')
    .select('team_id, team_role')
    .eq('admin_user_id', adminUserId)

  if (membershipsError) {
    console.error('[getWorkScope] Failed to load team memberships', membershipsError.message)
  }

  const rows = memberships || []
  return {
    adminUserId,
    seesAll,
    managesAllTeams,
    leadsTeamIds: rows.filter((r) => r.team_role === 'lead').map((r) => r.team_id),
    memberTeamIds: rows.map((r) => r.team_id),
  }
})

/** Minimal shape of a task needed to decide read/edit/delete access —
 * deliberately not the full WkTask row, so these checks can be unit
 * tested with plain fixtures and reused before a row is even fetched. */
export interface TaskScopeInput {
  assigneeId: string | null
  createdBy: string
  teamId: string | null
}

/** Can this scope read the given task at all. */
export function canReadTask(scope: WorkScope, task: TaskScopeInput): boolean {
  if (scope.seesAll) return true
  if (task.assigneeId === scope.adminUserId) return true
  if (task.createdBy === scope.adminUserId) return true
  if (task.teamId && scope.leadsTeamIds.includes(task.teamId)) return true
  return false
}

/** Can this scope open the task for editing at all (field-level limits
 * for a plain assignee are enforced separately by canEditTaskField). */
export function canEditTask(scope: WorkScope, task: TaskScopeInput): boolean {
  return canReadTask(scope, task)
}

/** Fields a task's own assignee may change when the task was assigned to
 * them by someone else (i.e. they didn't create it) — state, not
 * content. The creator of a task, a team lead of its team, or
 * seesAll/managesAllTeams scopes are not limited by this list; see
 * canEditTaskField. */
const ASSIGNEE_ONLY_EDITABLE_FIELDS = new Set<string>(['status', 'blocked_reason'])

/**
 * Can this scope change ONE specific field on this task. Reassignment
 * (`assignee_id`) and moving a task between teams (`team_id`) are NOT
 * covered here — those go through canAssignTaskToUser and are restricted
 * to managesAllTeams/seesAll at the route layer (see the Phase 1 report
 * for why team_id changes are deliberately not lead-delegable in V1).
 */
export function canEditTaskField(scope: WorkScope, task: TaskScopeInput, field: string): boolean {
  if (scope.seesAll || scope.managesAllTeams) return true
  if (task.teamId && scope.leadsTeamIds.includes(task.teamId)) return true
  if (task.createdBy === scope.adminUserId) return true
  if (task.assigneeId === scope.adminUserId) return ASSIGNEE_ONLY_EDITABLE_FIELDS.has(field)
  return false
}

/** Can this scope delete the task — stricter than edit: a plain
 * assignee (task created by someone else) can never delete it, only
 * change its state. */
export function canDeleteTask(scope: WorkScope, task: TaskScopeInput): boolean {
  if (scope.seesAll || scope.managesAllTeams) return true
  if (task.teamId && scope.leadsTeamIds.includes(task.teamId)) return true
  // A member may delete a purely personal task: one they created for
  // themself, never assigned by anyone else.
  if (task.createdBy === scope.adminUserId && task.assigneeId === scope.adminUserId) return true
  return false
}

/**
 * Can this scope assign/reassign a task (in the given team context, if
 * any) to targetAdminUserId. Pure scope-boundary check only — the
 * caller must separately confirm targetAdminUserId is actually a member
 * of teamId via isActiveTeamMember() before trusting this for a
 * cross-person assignment, since a lead's authority to assign is scoped
 * to people genuinely on the team they lead, not anyone at all.
 */
export function canAssignTaskToUser(scope: WorkScope, targetAdminUserId: string, teamId: string | null): boolean {
  if (scope.seesAll || scope.managesAllTeams) return true
  if (targetAdminUserId === scope.adminUserId) return true
  if (teamId && scope.leadsTeamIds.includes(teamId)) return true
  return false
}

/** Can this scope manage ONE team's details/membership (not create/delete
 * teams globally — that's canCreateTeam, limited to managesAllTeams). */
export function canManageTeam(scope: WorkScope, teamId: string): boolean {
  if (scope.managesAllTeams) return true
  return scope.leadsTeamIds.includes(teamId)
}

/** Can this scope see a team at all (read-only view). */
export function canReadTeam(scope: WorkScope, teamId: string): boolean {
  if (scope.seesAll || scope.managesAllTeams) return true
  return scope.memberTeamIds.includes(teamId)
}

/** Creating/deleting teams outright is deliberately NOT lead-delegable in
 * V1 — only work:manage_teams/work:manage_all. */
export function canCreateTeam(scope: WorkScope): boolean {
  return scope.managesAllTeams
}

/** True if adminUserId is an active member (lead or plain member) of
 * teamId — the DB-backed check canAssignTaskToUser's caller must run
 * before trusting a lead's assignment to an arbitrary person. */
export async function isActiveTeamMember(teamId: string, adminUserId: string): Promise<boolean> {
  const { data } = await supabaseServer
    .from('wk_team_members')
    .select('id')
    .eq('team_id', teamId)
    .eq('admin_user_id', adminUserId)
    .maybeSingle()
  return Boolean(data)
}
