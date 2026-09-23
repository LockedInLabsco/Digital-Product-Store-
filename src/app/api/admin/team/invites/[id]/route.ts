import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/src/lib/supabase/server'
import { requirePermission } from '@/src/lib/admin/auth'

// DELETE: revoke a pending invite. Only team:manage.
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission('team:manage')
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  try {
    const { data, error } = await supabaseServer
      .from('admin_invites')
      .update({ status: 'revoked' })
      .eq('id', params.id)
      .eq('status', 'pending')
      .select()
      .maybeSingle()

    if (error) {
      console.error('[DELETE /api/admin/team/invites/[id]] Failed to revoke invite', error.message)
      return NextResponse.json({ error: 'Failed to revoke invite' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Pending invite not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/admin/team/invites/[id]] Exception', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
