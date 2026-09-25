import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/src/lib/supabase/server'
import { requirePermission } from '@/src/lib/admin/auth'
import { validateContentMetricInput } from '@/src/lib/personal-brand/validate'

// GET all metric snapshots for one content item, oldest first.
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requirePermission('personal_brand:read')
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { data, error } = await supabaseServer
      .from('pb_content_metrics')
      .select('*')
      .eq('content_id', params.id)
      .order('recorded_at', { ascending: true })

    if (error) {
      console.error('[Personal Brand Metrics] Failed to fetch metrics', error.message)
      return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 })
    }

    return NextResponse.json({ metrics: data || [] })
  } catch (error) {
    console.error('[Personal Brand Metrics] Exception in GET', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST add a new metrics snapshot for this content item (e.g. "24 hour
// check-in", "7 day check-in") — content_metrics supports many rows per
// content item by design, never a single overwritten record.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requirePermission('personal_brand:write')
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { data: content } = await supabaseServer
      .from('pb_content_items')
      .select('id')
      .eq('id', params.id)
      .maybeSingle()

    if (!content) {
      return NextResponse.json({ error: 'Content item not found' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const result = validateContentMetricInput(body)
    if (result.error || !result.value) {
      return NextResponse.json({ error: result.error || 'Invalid metrics snapshot' }, { status: 400 })
    }

    const { data, error } = await supabaseServer
      .from('pb_content_metrics')
      .insert({ ...result.value, content_id: params.id })
      .select()
      .single()

    if (error) {
      console.error('[Personal Brand Metrics] Insert error', error.message)
      return NextResponse.json({ error: 'Failed to save metrics snapshot' }, { status: 500 })
    }

    return NextResponse.json({ metric: data }, { status: 201 })
  } catch (error) {
    console.error('[Personal Brand Metrics] Exception in POST', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
