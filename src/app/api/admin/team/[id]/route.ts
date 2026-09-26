import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/src/lib/supabase/server'
import { requirePermission } from '@/src/lib/admin/auth'
import { ADMIN_ROLES } from '@/src/lib/admin/permissions'
import { isLastActiveOwner } from '@/src/lib/admin/teamGuards'
import type { AdminRole, AdminStatus } from '@/src/types/admin'

const STATUS_VALUES: AdminStatus[] = ['active', 'disabled']

/** Validates a roles payload: must be an array, every entry a known
 * AdminRole, at least one, no duplicates. */
function parseRoles(value: unknown): AdminRole[] | null {
  if (!Array.isArray(value) || value.length === 0) return null
  const unique = Array.from(new Set(value))
  if (unique.some((r) => !ADMIN_ROLES.includes(r as AdminRole))) return null
  return unique as AdminRole[]
}

// PATCH: change role and/or status. Only team:manage. Guards against
// ever leaving zero active owners.
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission('team:manage')
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const updates: { roles?: AdminRole[]; status?: AdminStatus } = {}

    if (body.roles !== undefined) {
      const roles = parseRoles(body.roles)
      if (!roles) {
        return NextResponse.json({ error: 'Select at least one valid role' }, { status: 400 })
      }
      updates.roles = roles
    }

    if (body.status !== undefined) {
      if (!STATUS_VALUES.includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      updates.status = body.status
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    // Would this leave the team with zero active owners?
    const demotesFromOwner = updates.roles !== undefined && !updates.roles.includes('owner')
    const disables = updates.status === 'disabled'
    if ((demotesFromOwner || disables) && (await isLastActiveOwner(params.id))) {
      return NextResponse.json(
        { error: 'Cannot remove the last active owner. Promote another owner first.' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseServer
      .from('admin_users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select()
      .maybeSingle()

    if (error) {
      console.error('[PATCH /api/admin/team/[id]] Update failed', error.message)
      return NextResponse.json({ error: 'Failed to update team member' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    }

    return NextResponse.json({ member: data })
  } catch (error) {
    console.error('[PATCH /api/admin/team/[id]] Exception', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE: remove admin_users membership only — their Supabase Auth
// account (auth.users) is untouched, in case it's ever shared with
// other systems later. Only team:manage. Same last-owner guard as PATCH.
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission('team:manage')
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    if (await isLastActiveOwner(params.id)) {
      return NextResponse.json(
        { error: 'Cannot remove the last active owner. Promote another owner first.' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseServer.from('admin_users').delete().eq('id', params.id).select()

    if (error) {
      console.error('[DELETE /api/admin/team/[id]] Delete failed', error.message)
      return NextResponse.json({ error: 'Failed to remove team member' }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/admin/team/[id]] Exception', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
