import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/src/lib/supabase/server'
import { requirePermission } from '@/src/lib/admin/auth'
import { validateContentItemInput } from '@/src/lib/personal-brand/validate'

// GET single content item, with its full metrics snapshot history
// (oldest first, so charts/tables can read it in chronological order).
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requirePermission('personal_brand:read')
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { data: content, error } = await supabaseServer
      .from('pb_content_items')
      .select('*')
      .eq('id', params.id)
      .maybeSingle()

    if (error || !content) {
      return NextResponse.json({ error: 'Content item not found' }, { status: 404 })
    }

    const { data: metrics, error: metricsError } = await supabaseServer
      .from('pb_content_metrics')
      .select('*')
      .eq('content_id', params.id)
      .order('recorded_at', { ascending: true })

    if (metricsError) {
      console.error('[Personal Brand Content] Failed to fetch metrics', metricsError.message)
    }

    return NextResponse.json({ content, metrics: metrics || [] })
  } catch (error) {
    console.error('[Personal Brand Content] Exception in GET by id', error)
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
    const result = validateContentItemInput(body)
    if (result.error || !result.value) {
      return NextResponse.json({ error: result.error || 'Invalid content item' }, { status: 400 })
    }

    if (result.value.format_id) {
      const { data: format } = await supabaseServer
        .from('pb_formats')
        .select('id')
        .eq('id', result.value.format_id)
        .maybeSingle()
      if (!format) {
        return NextResponse.json({ error: 'Selected format does not exist' }, { status: 400 })
      }
    }

    const { data, error } = await supabaseServer
      .from('pb_content_items')
      .update({ ...result.value, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select()
      .maybeSingle()

    if (error) {
      console.error('[Personal Brand Content] Update error', error.message)
      return NextResponse.json({ error: 'Failed to update content item' }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: 'Content item not found' }, { status: 404 })
    }

    return NextResponse.json({ content: data })
  } catch (error) {
    console.error('[Personal Brand Content] Exception in PUT', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE content item (cascades to its metrics + experiment links via FK)
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requirePermission('personal_brand:write')
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { data, error } = await supabaseServer.from('pb_content_items').delete().eq('id', params.id).select()

    if (error) {
      console.error('[Personal Brand Content] Delete error', error.message)
      return NextResponse.json({ error: 'Failed to delete content item' }, { status: 500 })
    }
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Content item not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Personal Brand Content] Exception in DELETE', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
