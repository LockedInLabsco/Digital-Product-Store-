import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/src/lib/supabase/server'
import { requirePermission } from '@/src/lib/admin/auth'
import { getActiveWorkspaceContext, activeWorkspaceErrorResponse, roleCanWrite } from '@/src/lib/admin/activeSocialWorkspace'
import { validateExperimentInput } from '@/src/lib/personal-brand/validate'

// GET all experiments in the caller's active Social Workspace, each
// annotated with its linked content count.
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
      .from('pb_experiments')
      .select('*, links:pb_experiment_content(count)')
      .eq('workspace_id', active.context.workspaceId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Personal Brand Experiments] Failed to fetch experiments', error.message)
      return NextResponse.json({ error: 'Failed to fetch experiments' }, { status: 500 })
    }

    const experiments = (data || []).map((row: any) => {
      const { links, ...experiment } = row
      return { ...experiment, linked_content_count: links?.[0]?.count ?? 0 }
    })

    return NextResponse.json({ experiments })
  } catch (error) {
    console.error('[Personal Brand Experiments] Exception in GET', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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
    const result = validateExperimentInput(body)
    if (result.error || !result.value) {
      return NextResponse.json({ error: result.error || 'Invalid experiment' }, { status: 400 })
    }

    const { data, error } = await supabaseServer
      .from('pb_experiments')
      .insert({ ...result.value, workspace_id: active.context.workspaceId })
      .select()
      .single()

    if (error) {
      console.error('[Personal Brand Experiments] Insert error', error.message)
      return NextResponse.json({ error: 'Failed to create experiment' }, { status: 500 })
    }

    return NextResponse.json({ experiment: data }, { status: 201 })
  } catch (error) {
    console.error('[Personal Brand Experiments] Exception in POST', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
