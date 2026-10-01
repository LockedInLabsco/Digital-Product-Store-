import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/src/lib/supabase/server'
import { requireAdmin } from '@/src/lib/admin/auth'
import { getWorkScope, canManageTeam } from '@/src/lib/admin/workScope'
import { logWorkActivity } from '@/src/lib/work/activityLog'

const VALID_TEAM_ROLES = ['lead', 'member']

// POST: add a member to this team. Authorized managers only
// (canManageTeam — work:manage_teams/work:manage_all, or this team's own
// lead). Validates the referenced admin_user_id exists and is active
// before inserting — never trusts the client's claim that an id is a
// real, usable admin.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const scope = await getWorkScope()
  if (!scope || !canManageTeam(scope, params.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const adminUserId = typeof body.admin_user_id === 'string' ? body.admin_user_id : ''
    const teamRole = typeof body.team_role === 'string' ? body.team_role : 'member'

    if (!adminUserId) {
      return NextResponse.json({ error: 'admin_user_id is required' }, { status: 400 })
    }
    if (!VALID_TEAM_ROLES.includes(teamRole)) {
      return NextResponse.json({ error: `team_role must be one of: ${VALID_TEAM_ROLES.join(', ')}` }, { status: 400 })
    }

    const { data: targetAdmin } = await supabaseServer
      .from('admin_users')
      .select('id, status')
      .eq('id', adminUserId)
      .maybeSingle()

    if (!targetAdmin) {
      return NextResponse.json({ error: 'That admin account does not exist' }, { status: 400 })
    }
    if (targetAdmin.status !== 'active') {
      return NextResponse.json({ error: 'That admin account is disabled' }, { status: 400 })
    }

    const { data: team } = await supabaseServer.from('wk_teams').select('id').eq('id', params.id).maybeSingle()
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const { data: member, error } = await supabaseServer
      .from('wk_team_members')
      .insert({ team_id: params.id, admin_user_id: adminUserId, team_role: teamRole })
      .select()
      .maybeSingle()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'That admin is already a member of this team' }, { status: 409 })
      }
      console.error('[POST /api/admin/work/teams/[id]/members] Insert failed', error.message)
      return NextResponse.json({ error: 'Failed to add member' }, { status: 500 })
    }

    await logWorkActivity({
      actorAdminUserId: scope.adminUserId,
      action: 'team_member_added',
      entityType: 'team_member',
      entityId: member.id,
      metadata: { team_id: params.id, admin_user_id: adminUserId, team_role: teamRole },
    })

    return NextResponse.json({ member }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/admin/work/teams/[id]/members] Exception', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
