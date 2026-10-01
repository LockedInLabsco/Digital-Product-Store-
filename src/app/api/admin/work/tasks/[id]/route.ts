import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/src/lib/supabase/server'
import { requireAdmin } from '@/src/lib/admin/auth'
import {
  getWorkScope,
  canEditTask,
  canEditTaskField,
  canDeleteTask,
  isActiveTeamMember,
  type TaskScopeInput,
  type WorkScope,
} from '@/src/lib/admin/workScope'
import { logWorkActivity } from '@/src/lib/work/activityLog'
import { validateTaskPatchInput, validateBlockedReasonRule, deriveCompletedAt, type TaskPatchInput } from '@/src/lib/work/validate'
import type { WkTask, WkTaskStatus } from '@/src/types/work'

function toScopeInput(task: WkTask): TaskScopeInput {
  return { assigneeId: task.assignee_id, createdBy: task.created_by, teamId: task.team_id }
}

// PATCH: partial task update.
//
// Field-level authorization (see src/lib/admin/workScope.ts):
// - title/description/priority/start_date/due_date/due_time: the task's
//   creator, a lead of its team, or a seesAll/managesAllTeams scope —
//   NOT a plain assignee who didn't create the task (canEditTaskField).
// - status/blocked_reason: also allowed for the task's own assignee, in
//   addition to the above — this is the "change your own task's state"
//   path the brief describes for a Member.
// - assignee_id: routed through canAssignTaskToUser, never
//   canEditTaskField — a task's creator does NOT automatically gain the
//   right to hand it to someone else; that's always a separate
//   assignment decision gated the same way task creation is.
// - team_id: restricted to seesAll/managesAllTeams only in this phase —
//   moving a task between teams is deliberately not lead-delegable yet
//   (see the Work System Phase 1 report's Known Issues).
//
// completed_at is NEVER accepted from the client (TaskPatchInput has no
// such field) — it's derived here purely from the status transition.
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const scope = await getWorkScope()
  if (!scope) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { data: existing, error: fetchError } = await supabaseServer
      .from('wk_tasks')
      .select('*')
      .eq('id', params.id)
      .maybeSingle()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const existingTask = existing as WkTask
    const scopeInput = toScopeInput(existingTask)

    if (!canEditTask(scope, scopeInput)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const result = validateTaskPatchInput(body)
    if (result.error || !result.value) {
      return NextResponse.json({ error: result.error || 'Invalid update' }, { status: 400 })
    }
    const patch = result.value

    // Field-level checks for every generic field present in the patch.
    const genericFields = ['title', 'description', 'priority', 'status', 'blocked_reason', 'start_date', 'due_date', 'due_time'] as const
    for (const field of genericFields) {
      if (field in patch && !canEditTaskField(scope, scopeInput, field)) {
        return NextResponse.json({ error: `You cannot change ${field.replace('_', ' ')} on this task` }, { status: 403 })
      }
    }

    // team_id: seesAll/managesAllTeams only in V1.
    if ('team_id' in patch && patch.team_id !== existingTask.team_id) {
      if (!scope.seesAll && !scope.managesAllTeams) {
        return NextResponse.json({ error: 'You cannot move this task to a different team' }, { status: 403 })
      }
    }

    // assignee_id: always routed through canAssignTaskToUser, never
    // canEditTaskField — see docstring above.
    const assignabilityError = await checkAssigneeChange(scope, existingTask, patch)
    if (assignabilityError) {
      return NextResponse.json({ error: assignabilityError.message }, { status: assignabilityError.status })
    }

    const resultingStatus: WkTaskStatus = patch.status ?? existingTask.status
    const resultingBlockedReason = 'blocked_reason' in patch ? patch.blocked_reason ?? null : existingTask.blocked_reason
    const blockedRuleError = validateBlockedReasonRule(resultingStatus, resultingBlockedReason)
    if (blockedRuleError) {
      return NextResponse.json({ error: blockedRuleError }, { status: 400 })
    }

    const update: Record<string, unknown> = { ...patch, updated_at: new Date().toISOString() }

    const statusChanged = patch.status !== undefined && patch.status !== existingTask.status
    const nextCompletedAt = deriveCompletedAt(existingTask.status, patch.status)
    if (nextCompletedAt !== undefined) update.completed_at = nextCompletedAt

    const { data: updated, error: updateError } = await supabaseServer
      .from('wk_tasks')
      .update(update)
      .eq('id', params.id)
      .select()
      .maybeSingle()

    if (updateError || !updated) {
      console.error('[PATCH /api/admin/work/tasks/[id]] Update failed', updateError?.message)
      return NextResponse.json({ error: 'Failed to update task' }, { status: 500 })
    }

    await logTaskPatchActivity(scope, existingTask, patch, statusChanged)

    return NextResponse.json({ task: updated })
  } catch (error) {
    console.error('[PATCH /api/admin/work/tasks/[id]] Exception', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function checkAssigneeChange(
  scope: WorkScope,
  existingTask: WkTask,
  patch: { assignee_id?: string | null; team_id?: string | null }
): Promise<{ message: string; status: number } | null> {
  if (!('assignee_id' in patch) || patch.assignee_id === existingTask.assignee_id) return null

  const newAssignee = patch.assignee_id ?? null
  const effectiveTeamId = 'team_id' in patch ? patch.team_id ?? null : existingTask.team_id
  const isSelfTarget = newAssignee === scope.adminUserId

  if (isSelfTarget) return null

  // Not a self-claim (includes unassigning, i.e. newAssignee === null) —
  // requires company-wide manage authority or being a lead of the task's
  // (effective) team. Deliberately not routed through
  // canAssignTaskToUser(), since that function's "self" branch doesn't
  // apply here and a null target has no admin_users id to check it
  // against.
  if (!scope.seesAll && !scope.managesAllTeams) {
    if (!effectiveTeamId || !scope.leadsTeamIds.includes(effectiveTeamId)) {
      return { message: 'You cannot reassign this task', status: 403 }
    }
  }

  if (newAssignee && effectiveTeamId && !(await isActiveTeamMember(effectiveTeamId, newAssignee))) {
    return { message: 'That person is not a member of this task\'s team', status: 400 }
  }

  return null
}

async function logTaskPatchActivity(
  scope: WorkScope,
  existingTask: WkTask,
  patch: TaskPatchInput,
  statusChanged: boolean
): Promise<void> {
  if (statusChanged) {
    const to = patch.status as WkTaskStatus
    await logWorkActivity({
      actorAdminUserId: scope.adminUserId,
      action: 'task_status_changed',
      entityType: 'task',
      entityId: existingTask.id,
      metadata: { status: { from: existingTask.status, to } },
    })
    if (to === 'completed') {
      await logWorkActivity({ actorAdminUserId: scope.adminUserId, action: 'task_completed', entityType: 'task', entityId: existingTask.id })
    }
    if (to === 'blocked') {
      await logWorkActivity({
        actorAdminUserId: scope.adminUserId,
        action: 'task_blocked',
        entityType: 'task',
        entityId: existingTask.id,
        metadata: { blocked_reason: patch.blocked_reason ?? existingTask.blocked_reason },
      })
    }
  }

  if ('assignee_id' in patch && patch.assignee_id !== existingTask.assignee_id) {
    await logWorkActivity({
      actorAdminUserId: scope.adminUserId,
      action: existingTask.assignee_id ? 'task_reassigned' : 'task_assigned',
      entityType: 'task',
      entityId: existingTask.id,
      metadata: { from: existingTask.assignee_id, to: patch.assignee_id },
    })
  }

  const otherChangedFields = Object.keys(patch).filter((key) => key !== 'status' && key !== 'assignee_id' && key !== 'blocked_reason')
  if (otherChangedFields.length > 0) {
    await logWorkActivity({
      actorAdminUserId: scope.adminUserId,
      action: 'task_updated',
      entityType: 'task',
      entityId: existingTask.id,
      metadata: { fields: otherChangedFields },
    })
  }
}

// DELETE: stricter than edit — see canDeleteTask. A plain assignee whose
// task was created/assigned by someone else can never delete it, only
// change its state; a lead may delete any task within a team they lead;
// a member may delete a purely personal task (self-created, self-
// assigned).
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const scope = await getWorkScope()
  if (!scope) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { data: existing, error: fetchError } = await supabaseServer
      .from('wk_tasks')
      .select('*')
      .eq('id', params.id)
      .maybeSingle()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const existingTask = existing as WkTask
    if (!canDeleteTask(scope, toScopeInput(existingTask))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error } = await supabaseServer.from('wk_tasks').delete().eq('id', params.id)
    if (error) {
      console.error('[DELETE /api/admin/work/tasks/[id]] Delete failed', error.message)
      return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 })
    }

    await logWorkActivity({
      actorAdminUserId: scope.adminUserId,
      action: 'task_deleted',
      entityType: 'task',
      entityId: params.id,
      metadata: { title: existingTask.title },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/admin/work/tasks/[id]] Exception', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
