import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/src/lib/supabase/server'
import { requireAdmin } from '@/src/lib/admin/auth'
import { getWorkScope, canManageTeam } from '@/src/lib/admin/workScope'
import { wouldRemoveLastTeamLead } from '@/src/lib/work/teamGuards'
import { logWorkActivity } from '@/src/lib/work/activityLog'

const VALID_TEAM_ROLES = ['lead', 'member']

async function loadMemberRow(teamId: string, memberId: string) {
  const { data } = await supabaseServer
    .from('wk_team_members')
    .select('id, team_id, admin_user_id, team_role')
    .eq('id', memberId)
    .maybeSingle()
  // The memberId must actually belong to the team in the URL — never
  // trust the path alone to imply that relationship.
  if (!data || data.team_id !== teamId) return null
  return data
}

// PATCH: change a member's team_role (promote to lead / demote to
// member). Authorized managers only. Demoting a team's last lead is
// blocked — same "never collapse a required invariant to zero" shape as
// isLastActiveOwner() in src/lib/admin/teamGuards.ts.
export async function PATCH(request: NextRequest, { params }: { params: { id: string; memberId: string } }) {
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
    const teamRole = typeof body.team_role === 'string' ? body.team_role : ''
    if (!VALID_TEAM_ROLES.includes(teamRole)) {
      return NextResponse.json({ error: `team_role must be one of: ${VALID_TEAM_ROLES.join(', ')}` }, { status: 400 })
    }

    const existing = await loadMemberRow(params.id, params.memberId)
    if (!existing) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    }

    if (teamRole === 'member' && (await wouldRemoveLastTeamLead(params.memberId))) {
      return NextResponse.json(
        { error: 'Cannot demote the last lead of this team. Promote another lead first.' },
        { status: 400 }
      )
    }

    if (existing.team_role === teamRole) {
      return NextResponse.json({ member: existing })
    }

    const { data: member, error } = await supabaseServer
      .from('wk_team_members')
      .update({ team_role: teamRole })
      .eq('id', params.memberId)
      .select()
      .maybeSingle()

    if (error) {
      console.error('[PATCH /api/admin/work/teams/[id]/members/[memberId]] Update failed', error.message)
      return NextResponse.json({ error: 'Failed to update member role' }, { status: 500 })
    }

    await logWorkActivity({
      actorAdminUserId: scope.adminUserId,
      action: 'team_role_changed',
      entityType: 'team_member',
      entityId: params.memberId,
      metadata: { team_id: params.id, admin_user_id: existing.admin_user_id, from: existing.team_role, to: teamRole },
    })

    return NextResponse.json({ member })
  } catch (error) {
    console.error('[PATCH /api/admin/work/teams/[id]/members/[memberId]] Exception', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: remove a member from the team. Authorized managers only.
// Removing a team's last lead is blocked by the same guard as demotion —
// removal shrinks the lead count exactly the same way a demotion does.
export async function DELETE(request: NextRequest, { params }: { params: { id: string; memberId: string } }) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const scope = await getWorkScope()
  if (!scope || !canManageTeam(scope, params.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const existing = await loadMemberRow(params.id, params.memberId)
    if (!existing) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    }

    if (await wouldRemoveLastTeamLead(params.memberId)) {
      return NextResponse.json(
        { error: 'Cannot remove the last lead of this team. Promote another lead first.' },
        { status: 400 }
      )
    }

    const { error } = await supabaseServer.from('wk_team_members').delete().eq('id', params.memberId)
    if (error) {
      console.error('[DELETE /api/admin/work/teams/[id]/members/[memberId]] Delete failed', error.message)
      return NextResponse.json({ error: 'Failed to remove team member' }, { status: 500 })
    }

    await logWorkActivity({
      actorAdminUserId: scope.adminUserId,
      action: 'team_member_removed',
      entityType: 'team_member',
      entityId: params.memberId,
      metadata: { team_id: params.id, admin_user_id: existing.admin_user_id, team_role: existing.team_role },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/admin/work/teams/[id]/members/[memberId]] Exception', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
