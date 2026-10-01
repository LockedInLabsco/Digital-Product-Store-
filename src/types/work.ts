/**
 * Core types for the Work system foundation (teams, team membership,
 * one-off tasks, activity log). See src/lib/admin/workScope.ts for how
 * authorization over these rows is resolved, and
 * supabase/migrations/0024_work_foundation.sql for the schema this
 * mirrors.
 */

export type WkTeamRole = 'lead' | 'member'

export type WkTaskPriority = 'low' | 'normal' | 'high'

export type WkTaskStatus = 'not_started' | 'in_progress' | 'blocked' | 'completed' | 'cancelled'

export type WkTaskCreatorType = 'human' | 'system'

export interface WkTeam {
  id: string
  name: string
  description: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface WkTeamMember {
  id: string
  team_id: string
  admin_user_id: string
  team_role: WkTeamRole
  created_at: string
}

/** A team member row joined with just enough of its admin_users identity
 * to render a member list without a second round trip. */
export interface WkTeamMemberWithEmail extends WkTeamMember {
  email: string
}

export interface WkTask {
  id: string
  title: string
  description: string | null
  assignee_id: string | null
  created_by: string
  assigned_by: string | null
  creator_type: WkTaskCreatorType
  team_id: string | null
  priority: WkTaskPriority
  status: WkTaskStatus
  blocked_reason: string | null
  start_date: string | null
  due_date: string | null
  due_time: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export type WkActivityAction =
  | 'task_created'
  | 'task_updated'
  | 'task_assigned'
  | 'task_reassigned'
  | 'task_status_changed'
  | 'task_completed'
  | 'task_blocked'
  | 'task_deleted'
  | 'team_created'
  | 'team_updated'
  | 'team_member_added'
  | 'team_member_removed'
  | 'team_role_changed'

export type WkActivityEntityType = 'task' | 'team' | 'team_member'

export interface WkActivityLogEntry {
  id: string
  actor_admin_user_id: string
  action: WkActivityAction
  entity_type: WkActivityEntityType
  entity_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}
