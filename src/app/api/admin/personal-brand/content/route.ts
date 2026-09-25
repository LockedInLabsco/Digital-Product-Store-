import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/src/lib/supabase/server'
import { requirePermission } from '@/src/lib/admin/auth'
import { validateContentItemInput } from '@/src/lib/personal-brand/validate'

const MAX_ITEMS = 2000

// GET all content items, each annotated with its latest metrics
// snapshot (if any) so the library list can show current performance
// without a per-row round trip. This is a personal content log, not a
// multi-tenant table, so "fetch everything, filter/sort client-side" —
// the same approach the existing Waitlists admin list uses — is plenty.
export async function GET() {
  try {
    const auth = await requirePermission('personal_brand:read')
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { data: items, error } = await supabaseServer
      .from('pb_content_items')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(MAX_ITEMS)

    if (error) {
      console.error('[Personal Brand Content] Failed to fetch content items', error.message)
      return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 })
    }

    const contentIds = (items || []).map((item) => item.id)
    let latestByContentId: Record<string, any> = {}

    if (contentIds.length > 0) {
      const { data: metrics, error: metricsError } = await supabaseServer
        .from('pb_content_metrics')
        .select('*')
        .in('content_id', contentIds)
        .order('recorded_at', { ascending: false })

      if (metricsError) {
        console.error('[Personal Brand Content] Failed to fetch metrics for list', metricsError.message)
      } else {
        for (const metric of metrics || []) {
          // Rows arrive newest-first per content_id overall, but not
          // grouped — keep only the first (= latest) one seen per id.
          if (!latestByContentId[metric.content_id]) {
            latestByContentId[metric.content_id] = metric
          }
        }
      }
    }

    const contentWithLatestMetric = (items || []).map((item) => ({
      ...item,
      latest_metric: latestByContentId[item.id] || null,
    }))

    return NextResponse.json({ content: contentWithLatestMetric })
  } catch (error) {
    console.error('[Personal Brand Content] Exception in GET', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST create a new content item
export async function POST(request: NextRequest) {
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

    const { data, error } = await supabaseServer.from('pb_content_items').insert(result.value).select().single()

    if (error) {
      console.error('[Personal Brand Content] Insert error', error.message)
      return NextResponse.json({ error: 'Failed to create content item' }, { status: 500 })
    }

    return NextResponse.json({ content: data }, { status: 201 })
  } catch (error) {
    console.error('[Personal Brand Content] Exception in POST', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
