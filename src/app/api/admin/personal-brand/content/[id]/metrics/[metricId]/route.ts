import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/src/lib/supabase/server'
import { requirePermission } from '@/src/lib/admin/auth'

// DELETE one metrics snapshot (e.g. fixing a mis-entered number by
// removing and re-adding it) — scoped to its parent content_id so an id
// can't be used to delete a snapshot belonging to a different item.
export async function DELETE(request: NextRequest, { params }: { params: { id: string; metricId: string } }) {
  try {
    const auth = await requirePermission('personal_brand:write')
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { data, error } = await supabaseServer
      .from('pb_content_metrics')
      .delete()
      .eq('id', params.metricId)
      .eq('content_id', params.id)
      .select()

    if (error) {
      console.error('[Personal Brand Metrics] Delete error', error.message)
      return NextResponse.json({ error: 'Failed to delete metrics snapshot' }, { status: 500 })
    }
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Metrics snapshot not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Personal Brand Metrics] Exception in DELETE', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
