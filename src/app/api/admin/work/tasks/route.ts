import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/src/lib/supabase/server'
import { requireAdmin } from '@/src/lib/admin/auth'
import { getWorkScope, canAssignTaskToUser, isActiveTeamMember } from '@/src/lib/admin/workScope'
import { logWorkActivity } from '@/src/lib/work/activityLog'
import { validateTaskCreateInput, WK_TASK_STATUSES } from '@/src/lib/work/validate'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// GET: tasks visible to the current admin, optionally narrowed by
// status/team_id/assignee_id query params. The scope filter (.or(...))
// and the requested filters (.eq(...)) are ANDed by Supabase's query
// builder, so a requested filter can only ever narrow what's already
// authorized — never widen it. See getWorkScope's doc comment for why
// this can't be done by trusting a client-sent team_id/assignee_id
// alone.
export async function GET(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const scope = await getWorkScope()
  if (!scope) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const params = request.nextUrl.searchParams
    const statusFilter = params.get('status')
    const teamIdFilter = params.get('team_id')
    const assigneeIdFilter = params.get('assignee_id')

    if (statusFilter && !WK_TASK_STATUSES.includes(statusFilter as (typeof WK_TASK_STATUSES)[number])) {
      return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 })
    }
    if (teamIdFilter && !UUID_PATTERN.test(teamIdFilter)) {
      return NextResponse.json({ error: 'Invalid team_id filter' }, { status: 400 })
    }
    if (assigneeIdFilter && !UUID_PATTERN.test(assigneeIdFilter)) {
      return NextResponse.json({ error: 'Invalid assignee_id filter' }, { status: 400 })
    }

    let query = supabaseServer.from('wk_tasks').select('*').order('due_date', { ascending: true, nullsFirst: false })

    if (!scope.seesAll) {
      const orParts = [`assignee_id.eq.${scope.adminUserId}`, `created_by.eq.${scope.adminUserId}`]
      if (scope.leadsTeamIds.length > 0) {
        orParts.push(`team_id.in.(${scope.leadsTeamIds.join(',')})`)
      }
      query = query.or(orParts.join(','))
    }

    if (statusFilter) query = query.eq('status', statusFilter)
    if (teamIdFilter) query = query.eq('team_id', teamIdFilter)
    if (assigneeIdFilter) query = query.eq('assignee_id', assigneeIdFilter)

    const { data: tasks, error } = await query
    if (error) {
      console.error('[GET /api/admin/work/tasks] Failed to load tasks', error.message)
      return NextResponse.json({ error: 'Failed to load tasks' }, { status: 500 })
    }

    // Resolve just the people/teams referenced in THIS result set (not
    // the full roster) so the UI can render names instead of raw ids.
    const peopleIds = new Set<string>()
    const teamIds = new Set<string>()
    for (const task of tasks || []) {
      if (task.assignee_id) peopleIds.add(task.assignee_id)
      if (task.created_by) peopleIds.add(task.created_by)
      if (task.assigned_by) peopleIds.add(task.assigned_by)
      if (task.team_id) teamIds.add(task.team_id)
    }

    const [{ data: people }, { data: teams }] = await Promise.all([
      peopleIds.size
        ? supabaseServer.from('admin_users').select('id, email').in('id', Array.from(peopleIds))
        : Promise.resolve({ data: [] as { id: string; email: string }[] }),
      teamIds.size
        ? supabaseServer.from('wk_teams').select('id, name').in('id', Array.from(teamIds))
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    ])

    return NextResponse.json({
      tasks: tasks || [],
      myAdminUserId: scope.adminUserId,
      people: Object.fromEntries((people || []).map((p) => [p.id, p.email])),
      teams: Object.fromEntries((teams || []).map((t) => [t.id, t.name])),
    })
  } catch (error) {
    console.error('[GET /api/admin/work/tasks] Exception', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: create a task.
//
// - Member creating for themself (assignee_id omitted or === self):
//   always allowed, team_id only allowed if they belong to that team.
// - Assigning to someone else: requires canAssignTaskToUser (owner/
//   manage_all, or a lead of the given team_id) AND the target must
//   actually be a member of that team (isActiveTeamMember) — a lead's
//   authority to assign never extends past people genuinely on the team
//   they lead. Assigning to someone else with no team_id is rejected:
//   without a team context there is no basis for a lead's authority, and
//   a plain member can never assign to someone else at all.
export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const scope = await getWorkScope()
  if (!scope) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const result = validateTaskCreateInput(body)
    if (result.error || !result.value) {
      return NextResponse.json({ error: result.error || 'Invalid task' }, { status: 400 })
    }

    const input = result.value
    const assigneeId = input.assignee_id ?? scope.adminUserId
    const teamId = input.team_id

    const isSelfAssign = assigneeId === scope.adminUserId

    if (!isSelfAssign) {
      if (!teamId) {
        return NextResponse.json({ error: 'A team is required to assign a task to someone else' }, { status: 400 })
      }
      if (!canAssignTaskToUser(scope, assigneeId, teamId)) {
        return NextResponse.json({ error: 'You cannot assign tasks to that person' }, { status: 403 })
      }
      if (!(await isActiveTeamMember(teamId, assigneeId))) {
        return NextResponse.json({ error: 'That person is not a member of the selected team' }, { status: 400 })
      }
    }

    // Even a self-task tagged with a team requires genuine membership in
    // that team (seesAll/managesAllTeams scopes are exempt — they can
    // file work anywhere).
    if (teamId && !scope.seesAll && !scope.managesAllTeams && !scope.memberTeamIds.includes(teamId)) {
      return NextResponse.json({ error: 'You are not a member of the selected team' }, { status: 400 })
    }

    const assignedBy = isSelfAssign ? null : scope.adminUserId
    const completedAt = input.status === 'completed' ? new Date().toISOString() : null

    const { data: task, error } = await supabaseServer
      .from('wk_tasks')
      .insert({
        title: input.title,
        description: input.description,
        assignee_id: assigneeId,
        created_by: scope.adminUserId,
        assigned_by: assignedBy,
        creator_type: 'human',
        team_id: teamId,
        priority: input.priority,
        status: input.status,
        blocked_reason: input.blocked_reason,
        start_date: input.start_date,
        due_date: input.due_date,
        due_time: input.due_time,
        completed_at: completedAt,
      })
      .select()
      .maybeSingle()

    if (error || !task) {
      console.error('[POST /api/admin/work/tasks] Insert failed', error?.message)
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
    }

    await logWorkActivity({
      actorAdminUserId: scope.adminUserId,
      action: 'task_created',
      entityType: 'task',
      entityId: task.id,
      metadata: { title: task.title, status: task.status, team_id: teamId },
    })

    if (!isSelfAssign) {
      await logWorkActivity({
        actorAdminUserId: scope.adminUserId,
        action: 'task_assigned',
        entityType: 'task',
        entityId: task.id,
        metadata: { to: assigneeId },
      })
    }

    return NextResponse.json({ task }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/admin/work/tasks] Exception', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
