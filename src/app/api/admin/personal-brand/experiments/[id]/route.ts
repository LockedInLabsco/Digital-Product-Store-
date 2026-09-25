import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/src/lib/supabase/server'
import { requirePermission } from '@/src/lib/admin/auth'
import { validateExperimentInput } from '@/src/lib/personal-brand/validate'

// GET single experiment, with its linked content items (id + title only
// — enough for the experiment detail view without a second round trip).
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requirePermission('personal_brand:read')
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { data: experiment, error } = await supabaseServer
      .from('pb_experiments')
      .select('*')
      .eq('id', params.id)
      .maybeSingle()

    if (error || !experiment) {
      return NextResponse.json({ error: 'Experiment not found' }, { status: 404 })
    }

    const { data: links, error: linksError } = await supabaseServer
      .from('pb_experiment_content')
      .select('content_id, content:pb_content_items(id, title, status, posted_at)')
      .eq('experiment_id', params.id)

    if (linksError) {
      console.error('[Personal Brand Experiments] Failed to fetch linked content', linksError.message)
    }

    return NextResponse.json({ experiment, linkedContent: (links || []).map((l: any) => l.content).filter(Boolean) })
  } catch (error) {
    console.error('[Personal Brand Experiments] Exception in GET by id', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requirePermission('personal_brand:write')
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json().catch(() => ({}))
    const result = validateExperimentInput(body)
    if (result.error || !result.value) {
      return NextResponse.json({ error: result.error || 'Invalid experiment' }, { status: 400 })
    }

    const { data, error } = await supabaseServer
      .from('pb_experiments')
      .update({ ...result.value, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select()
      .maybeSingle()

    if (error) {
      console.error('[Personal Brand Experiments] Update error', error.message)
      return NextResponse.json({ error: 'Failed to update experiment' }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: 'Experiment not found' }, { status: 404 })
    }

    return NextResponse.json({ experiment: data })
  } catch (error) {
    console.error('[Personal Brand Experiments] Exception in PUT', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE experiment (cascades to its pb_experiment_content links via FK)
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requirePermission('personal_brand:write')
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { data, error } = await supabaseServer.from('pb_experiments').delete().eq('id', params.id).select()

    if (error) {
      console.error('[Personal Brand Experiments] Delete error', error.message)
      return NextResponse.json({ error: 'Failed to delete experiment' }, { status: 500 })
    }
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Experiment not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Personal Brand Experiments] Exception in DELETE', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
