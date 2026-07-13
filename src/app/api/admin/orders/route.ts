import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/src/lib/admin/auth'
import { supabaseServer } from '@/src/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  console.log('[GET /api/admin/orders] Fetching recent orders')

  try {
    if (!isAdminRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabaseServer
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('[GET /api/admin/orders] Supabase error:', error.message)
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      )
    }

    return NextResponse.json({ orders: data || [] })
  } catch (error) {
    console.error('[GET /api/admin/orders] Exception:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
