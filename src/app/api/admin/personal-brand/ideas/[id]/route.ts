import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/src/lib/supabase/server'
import { requirePermission } from '@/src/lib/admin/auth'
import { getActiveWorkspaceContext, activeWorkspaceErrorResponse, roleCanWrite } from '@/src/lib/admin/activeSocialWorkspace'
import { validateIdeaInput } from '@/src/lib/personal-brand/validate'

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requirePermission('personal_brand:write')
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const active = await getActiveWorkspaceContext()
    if (!active.ok) {
      return activeWorkspaceErrorResponse(active.reason)
    }
    if (!roleCanWrite(active.context.role)) {
      return NextResponse.json({ error: 'You do not have write access to this Social Workspace' }, { status: 403 })
    }

    const { data: existing } = await supabaseServer.from('pb_ideas').select('workspace_id').eq('id', params.id).maybeSingle()
    if (!existing || existing.workspace_id !== active.context.workspaceId) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const result = validateIdeaInput(body)
    if (result.error || !result.value) {
      return NextResponse.json({ error: result.error || 'Invalid idea' }, { status: 400 })
    }

    const { data, error } = await supabaseServer
      .from('pb_ideas')
      .update({ ...result.value, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select()
      .maybeSingle()

    if (error) {
      console.error('[Personal Brand Ideas] Update error', error.message)
      return NextResponse.json({ error: 'Failed to update idea' }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 })
    }

    return NextResponse.json({ idea: data })
  } catch (error) {
    console.error('[Personal Brand Ideas] Exception in PUT', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requirePermission('personal_brand:write')
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const active = await getActiveWorkspaceContext()
    if (!active.ok) {
      return activeWorkspaceErrorResponse(active.reason)
    }
    if (!roleCanWrite(active.context.role)) {
      return NextResponse.json({ error: 'You do not have write access to this Social Workspace' }, { status: 403 })
    }

    const { data: existing } = await supabaseServer.from('pb_ideas').select('workspace_id').eq('id', params.id).maybeSingle()
    if (!existing || existing.workspace_id !== active.context.workspaceId) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 })
    }

    const { data, error } = await supabaseServer.from('pb_ideas').delete().eq('id', params.id).select()

    if (error) {
      console.error('[Personal Brand Ideas] Delete error', error.message)
      return NextResponse.json({ error: 'Failed to delete idea' }, { status: 500 })
    }
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Idea not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Personal Brand Ideas] Exception in DELETE', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
