import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/src/lib/supabase/server'
import { requirePermission } from '@/src/lib/admin/auth'
import { getActiveWorkspaceContext, activeWorkspaceErrorResponse, roleCanWrite } from '@/src/lib/admin/activeSocialWorkspace'
import { validateFormatInput } from '@/src/lib/personal-brand/validate'

// GET all formats in the caller's active Social Workspace (used by the
// Winning Formats page and by the content item form's format picker).
export async function GET() {
  try {
    const auth = await requirePermission('personal_brand:read')
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const active = await getActiveWorkspaceContext()
    if (!active.ok) {
      return activeWorkspaceErrorResponse(active.reason)
    }

    const { data, error } = await supabaseServer
      .from('pb_formats')
      .select('*')
      .eq('workspace_id', active.context.workspaceId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Personal Brand Formats] Failed to fetch formats', error.message)
      return NextResponse.json({ error: 'Failed to fetch formats' }, { status: 500 })
    }

    return NextResponse.json({ formats: data || [] })
  } catch (error) {
    console.error('[Personal Brand Formats] Exception in GET', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST create a new format, in the caller's one writable Social Workspace.
export async function POST(request: NextRequest) {
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

    const body = await request.json().catch(() => ({}))
    const result = validateFormatInput(body)
    if (result.error || !result.value) {
      return NextResponse.json({ error: result.error || 'Invalid format' }, { status: 400 })
    }

    const { data, error } = await supabaseServer
      .from('pb_formats')
      .insert({ ...result.value, workspace_id: active.context.workspaceId })
      .select()
      .single()

    if (error) {
      console.error('[Personal Brand Formats] Insert error', error.message)
      return NextResponse.json({ error: 'Failed to create format' }, { status: 500 })
    }

    return NextResponse.json({ format: data }, { status: 201 })
  } catch (error) {
    console.error('[Personal Brand Formats] Exception in POST', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
