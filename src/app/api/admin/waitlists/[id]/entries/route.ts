import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/src/lib/supabase/server'
import { requirePermission } from '@/src/lib/admin/auth'

// Lightweight lead list for the admin detail page — search/sort/CSV are
// all done client-side against this one payload, which is plenty for a
// lead-gen waitlist (not a CRM). Capped defensively in case one waitlist
// ever grows very large.
const MAX_ENTRIES = 5000

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requirePermission('waitlists:read')
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { data, error } = await supabaseServer
      .from('waitlist_entries')
      .select('*')
      .eq('waitlist_id', params.id)
      .order('created_at', { ascending: false })
      .limit(MAX_ENTRIES)

    if (error) {
      console.error('[Admin Waitlists] Failed to fetch entries', error.message)
      return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
    }

    return NextResponse.json({ entries: data || [] })
  } catch (error) {
    console.error('[Admin Waitlists] Exception fetching entries', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Bulk-delete leads (e.g. clearing out test signups at once) — pass
// { ids: string[] } in the body. Scoped to this waitlist_id, same as
// the single-entry DELETE route, so an id can't be used to delete an
// entry belonging to a different waitlist.
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requirePermission('waitlists:write')
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json().catch(() => ({}))
    const ids = Array.isArray(body.ids)
      ? body.ids.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
      : []

    if (ids.length === 0) {
      return NextResponse.json({ error: 'No lead ids provided' }, { status: 400 })
    }

    const { data, error } = await supabaseServer
      .from('waitlist_entries')
      .delete()
      .eq('waitlist_id', params.id)
      .in('id', ids)
      .select()

    if (error) {
      console.error('[Admin Waitlists] Failed to bulk delete entries', error.message)
      return NextResponse.json({ error: 'Failed to delete leads' }, { status: 500 })
    }

    return NextResponse.json({ success: true, deletedCount: data?.length || 0 })
  } catch (error) {
    console.error('[Admin Waitlists] Exception bulk deleting entries', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
