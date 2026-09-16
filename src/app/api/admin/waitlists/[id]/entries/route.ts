import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/src/lib/supabase/server'
import { isAdminRequest } from '@/src/lib/admin/auth'

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
    if (!isAdminRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
