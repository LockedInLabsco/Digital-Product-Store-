import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/src/lib/supabase/server'
import { requirePermission } from '@/src/lib/admin/auth'

// POST link a content item to this experiment — { content_id }. Uses the
// pb_experiment_content join table (composite primary key on
// (experiment_id, content_id)), never a packed id list on the experiment
// row itself.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requirePermission('personal_brand:write')
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json().catch(() => ({}))
    const contentId = typeof body.content_id === 'string' ? body.content_id.trim() : ''
    if (!contentId) {
      return NextResponse.json({ error: 'content_id is required' }, { status: 400 })
    }

    const [{ data: experiment }, { data: content }] = await Promise.all([
      supabaseServer.from('pb_experiments').select('id').eq('id', params.id).maybeSingle(),
      supabaseServer.from('pb_content_items').select('id').eq('id', contentId).maybeSingle(),
    ])

    if (!experiment) return NextResponse.json({ error: 'Experiment not found' }, { status: 404 })
    if (!content) return NextResponse.json({ error: 'Content item not found' }, { status: 404 })

    const { error } = await supabaseServer
      .from('pb_experiment_content')
      .insert({ experiment_id: params.id, content_id: contentId })

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'That content item is already linked to this experiment' }, { status: 409 })
      }
      console.error('[Personal Brand Experiments] Failed to link content', error.message)
      return NextResponse.json({ error: 'Failed to link content' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('[Personal Brand Experiments] Exception in POST content link', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE unlink a content item from this experiment — { content_id }.
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requirePermission('personal_brand:write')
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json().catch(() => ({}))
    const contentId = typeof body.content_id === 'string' ? body.content_id.trim() : ''
    if (!contentId) {
      return NextResponse.json({ error: 'content_id is required' }, { status: 400 })
    }

    const { error } = await supabaseServer
      .from('pb_experiment_content')
      .delete()
      .eq('experiment_id', params.id)
      .eq('content_id', contentId)

    if (error) {
      console.error('[Personal Brand Experiments] Failed to unlink content', error.message)
      return NextResponse.json({ error: 'Failed to unlink content' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Personal Brand Experiments] Exception in DELETE content link', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
