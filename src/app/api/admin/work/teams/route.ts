import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/src/lib/supabase/server'
import { requireAdmin } from '@/src/lib/admin/auth'
import { getWorkScope, canCreateTeam } from '@/src/lib/admin/workScope'
import { logWorkActivity } from '@/src/lib/work/activityLog'
import { validateTeamInput } from '@/src/lib/work/validate'

// GET: teams visible to the current admin — every team if they have
// company-wide read (work:read_all/work:manage_all) or manage all teams
// (work:manage_teams), otherwise only teams they belong to (lead or
// member), per wk_team_members. Never trusts a client filter for this —
// scope comes entirely from getWorkScope().
export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const scope = await getWorkScope()
  if (!scope) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    let query = supabaseServer.from('wk_teams').select('*').order('created_at', { ascending: true })
    if (!scope.seesAll && !scope.managesAllTeams) {
      if (scope.memberTeamIds.length === 0) {
        return NextResponse.json({ teams: [], myAdminUserId: scope.adminUserId, canCreate: false })
      }
      query = query.in('id', scope.memberTeamIds)
    }

    const { data: teams, error } = await query
    if (error) {
      console.error('[GET /api/admin/work/teams] Failed to load teams', error.message)
      return NextResponse.json({ error: 'Failed to load teams' }, { status: 500 })
    }

    const teamsWithRole = (teams || []).map((team) => ({
      ...team,
      myRole: scope.leadsTeamIds.includes(team.id) ? 'lead' : scope.memberTeamIds.includes(team.id) ? 'member' : null,
    }))

    return NextResponse.json({
      teams: teamsWithRole,
      myAdminUserId: scope.adminUserId,
      canCreate: canCreateTeam(scope),
    })
  } catch (error) {
    console.error('[GET /api/admin/work/teams] Exception', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: create a team. Restricted to work:manage_teams/work:manage_all —
// deliberately NOT lead-delegable (a lead manages the teams they already
// lead, but creating new teams is a company-structure decision). The
// creator is not automatically added as a member/lead — add membership
// explicitly afterward.
export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const scope = await getWorkScope()
  if (!scope || !canCreateTeam(scope)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const result = validateTeamInput(body)
    if (result.error || !result.value) {
      return NextResponse.json({ error: result.error || 'Invalid team' }, { status: 400 })
    }

    const { data: team, error } = await supabaseServer
      .from('wk_teams')
      .insert({ name: result.value.name, description: result.value.description, created_by: scope.adminUserId })
      .select()
      .maybeSingle()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A team with this name already exists' }, { status: 409 })
      }
      console.error('[POST /api/admin/work/teams] Insert failed', error.message)
      return NextResponse.json({ error: 'Failed to create team' }, { status: 500 })
    }

    await logWorkActivity({
      actorAdminUserId: scope.adminUserId,
      action: 'team_created',
      entityType: 'team',
      entityId: team.id,
      metadata: { name: team.name },
    })

    return NextResponse.json({ team }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/admin/work/teams] Exception', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
