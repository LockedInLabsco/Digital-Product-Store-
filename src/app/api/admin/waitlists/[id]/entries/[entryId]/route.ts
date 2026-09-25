import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/src/lib/supabase/server'
import { requirePermission } from '@/src/lib/admin/auth'

// DELETE a single lead/entry (e.g. removing a test signup) — never
// touches the waitlist itself, only one row in waitlist_entries.
// Scoped by both entryId and waitlist_id so an entry can only be
// deleted through the waitlist it actually belongs to.
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; entryId: string } }
) {
  try {
    const auth = await requirePermission('waitlists:write')
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { data, error } = await supabaseServer
      .from('waitlist_entries')
      .delete()
      .eq('id', params.entryId)
      .eq('waitlist_id', params.id)
      .select()

    if (error) {
      console.error('[Admin Waitlists] Failed to delete entry', error.message)
      return NextResponse.json({ error: 'Failed to delete lead' }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Admin Waitlists] Exception deleting entry', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
