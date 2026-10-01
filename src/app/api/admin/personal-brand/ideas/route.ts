import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/src/lib/supabase/server'
import { requirePermission } from '@/src/lib/admin/auth'
import { getSocialWorkspaceScope, resolveDefaultWritableWorkspaceId } from '@/src/lib/admin/socialWorkspaceScope'
import { validateIdeaInput } from '@/src/lib/personal-brand/validate'

export async function GET() {
  try {
    const auth = await requirePermission('personal_brand:read')
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const scope = await getSocialWorkspaceScope()
    if (!scope) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (scope.memberWorkspaceIds.length === 0) {
      return NextResponse.json({ ideas: [] })
    }

    const { data, error } = await supabaseServer
      .from('pb_ideas')
      .select('*')
      .in('workspace_id', scope.memberWorkspaceIds)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Personal Brand Ideas] Failed to fetch ideas', error.message)
      return NextResponse.json({ error: 'Failed to fetch ideas' }, { status: 500 })
    }

    return NextResponse.json({ ideas: data || [] })
  } catch (error) {
    console.error('[Personal Brand Ideas] Exception in GET', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission('personal_brand:write')
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const scope = await getSocialWorkspaceScope()
    if (!scope) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const workspaceResult = resolveDefaultWritableWorkspaceId(scope)
    if (!workspaceResult.ok) {
      return NextResponse.json({ error: workspaceResult.error }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const result = validateIdeaInput(body)
    if (result.error || !result.value) {
      return NextResponse.json({ error: result.error || 'Invalid idea' }, { status: 400 })
    }

    const { data, error } = await supabaseServer
      .from('pb_ideas')
      .insert({ ...result.value, workspace_id: workspaceResult.workspaceId })
      .select()
      .single()

    if (error) {
      console.error('[Personal Brand Ideas] Insert error', error.message)
      return NextResponse.json({ error: 'Failed to create idea' }, { status: 500 })
    }

    return NextResponse.json({ idea: data }, { status: 201 })
  } catch (error) {
    console.error('[Personal Brand Ideas] Exception in POST', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
