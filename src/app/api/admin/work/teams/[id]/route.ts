import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/src/lib/supabase/server'
import { requireAdmin } from '@/src/lib/admin/auth'
import { getWorkScope, canManageTeam, canReadTeam } from '@/src/lib/admin/workScope'
import { logWorkActivity } from '@/src/lib/work/activityLog'
import { validateTeamInput } from '@/src/lib/work/validate'

// GET: one team, its members (joined with email), and — only if the
// current admin can manage THIS team — the list of other active admins
// eligible to add as members. Eligibility is computed server-side and
// gated per-team; a plain member never sees the admin roster through
// this route.
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const scope = await getWorkScope()
  if (!scope || !canReadTeam(scope, params.id)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { data: team, error: teamError } = await supabaseServer
      .from('wk_teams')
      .select('*')
      .eq('id', params.id)
      .maybeSingle()

    if (teamError || !team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    const { data: memberRows, error: membersError } = await supabaseServer
      .from('wk_team_members')
      .select('id, team_id, admin_user_id, team_role, created_at')
      .eq('team_id', params.id)
      .order('created_at', { ascending: true })

    if (membersError) {
      console.error('[GET /api/admin/work/teams/[id]] Failed to load members', membersError.message)
      return NextResponse.json({ error: 'Failed to load team' }, { status: 500 })
    }

    const memberAdminIds = (memberRows || []).map((m) => m.admin_user_id)
    const { data: memberAdmins } = memberAdminIds.length
      ? await supabaseServer.from('admin_users').select('id, email').in('id', memberAdminIds)
      : { data: [] as { id: string; email: string }[] }

    const emailById = new Map((memberAdmins || []).map((a) => [a.id, a.email]))
    const members = (memberRows || []).map((m) => ({ ...m, email: emailById.get(m.admin_user_id) || 'unknown' }))

    const canManage = canManageTeam(scope, params.id)
    let eligibleAdmins: { id: string; email: string }[] = []
    if (canManage) {
      const { data: activeAdmins } = await supabaseServer
        .from('admin_users')
        .select('id, email')
        .eq('status', 'active')
        .order('email', { ascending: true })
      eligibleAdmins = (activeAdmins || []).filter((a) => !memberAdminIds.includes(a.id))
    }

    return NextResponse.json({ team, members, canManage, eligibleAdmins, myAdminUserId: scope.adminUserId })
  } catch (error) {
    console.error('[GET /api/admin/work/teams/[id]] Exception', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH: update name/description. Authorized managers only (see
// canManageTeam — work:manage_teams/work:manage_all, or a lead of this
// specific team).
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
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
    const result = validateTeamInput(body)
    if (result.error || !result.value) {
      return NextResponse.json({ error: result.error || 'Invalid team' }, { status: 400 })
    }

    const { data: team, error } = await supabaseServer
      .from('wk_teams')
      .update({ name: result.value.name, description: result.value.description, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select()
      .maybeSingle()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A team with this name already exists' }, { status: 409 })
      }
      console.error('[PATCH /api/admin/work/teams/[id]] Update failed', error.message)
      return NextResponse.json({ error: 'Failed to update team' }, { status: 500 })
    }
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    await logWorkActivity({
      actorAdminUserId: scope.adminUserId,
      action: 'team_updated',
      entityType: 'team',
      entityId: team.id,
      metadata: { name: team.name },
    })

    return NextResponse.json({ team })
  } catch (error) {
    console.error('[PATCH /api/admin/work/teams/[id]] Exception', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
