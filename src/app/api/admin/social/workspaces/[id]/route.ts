import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/src/lib/supabase/server'
import { requirePermission } from '@/src/lib/admin/auth'
import { getSocialWorkspaceScope, canManageWorkspaceMembers } from '@/src/lib/admin/socialWorkspaceScope'

const UNIQUE_VIOLATION = '23505'

// PATCH { name } — rename a Social Workspace. Gated the same way
// workspace membership changes are (canManageWorkspaceMembers: this
// workspace's own owner, or the global social:manage_workspaces
// override) — renaming is workspace administration, not day-to-day
// content work, so a manager/analyst member cannot do this even though
// they can read/write the workspace's content.
//
// Does NOT touch connected accounts, content, or membership — purely
// the social_workspaces.name column. Lets an admin repurpose/clean up a
// workspace (e.g. a leftover empty one from an old migration) by
// renaming it instead of deleting it.
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission('personal_brand:write')
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const scope = await getSocialWorkspaceScope()
  if (!scope || !canManageWorkspaceMembers(scope, params.id)) {
    return NextResponse.json({ error: 'Social Workspace not found' }, { status: 404 })
  }

  const body = await request.json().catch(() => ({}))
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) {
    return NextResponse.json({ error: 'Workspace name is required' }, { status: 400 })
  }

  const { data, error } = await supabaseServer
    .from('social_workspaces')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select('id, name')
    .maybeSingle()

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return NextResponse.json({ error: 'A workspace with that name already exists' }, { status: 409 })
    }
    console.error('[Workspace Rename] Failed to rename workspace', error.message)
    return NextResponse.json({ error: 'Failed to rename this workspace' }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'Social Workspace not found' }, { status: 404 })
  }

  return NextResponse.json({ workspace: data })
}
