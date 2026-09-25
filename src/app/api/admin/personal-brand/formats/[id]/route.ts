import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/src/lib/supabase/server'
import { requirePermission } from '@/src/lib/admin/auth'
import { validateFormatInput } from '@/src/lib/personal-brand/validate'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requirePermission('personal_brand:read')
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { data, error } = await supabaseServer.from('pb_formats').select('*').eq('id', params.id).maybeSingle()

    if (error || !data) {
      return NextResponse.json({ error: 'Format not found' }, { status: 404 })
    }

    return NextResponse.json({ format: data })
  } catch (error) {
    console.error('[Personal Brand Formats] Exception in GET by id', error)
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
    const result = validateFormatInput(body)
    if (result.error || !result.value) {
      return NextResponse.json({ error: result.error || 'Invalid format' }, { status: 400 })
    }

    const { data, error } = await supabaseServer
      .from('pb_formats')
      .update({ ...result.value, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select()
      .maybeSingle()

    if (error) {
      console.error('[Personal Brand Formats] Update error', error.message)
      return NextResponse.json({ error: 'Failed to update format' }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: 'Format not found' }, { status: 404 })
    }

    return NextResponse.json({ format: data })
  } catch (error) {
    console.error('[Personal Brand Formats] Exception in PUT', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requirePermission('personal_brand:write')
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { data, error } = await supabaseServer.from('pb_formats').delete().eq('id', params.id).select()

    if (error) {
      console.error('[Personal Brand Formats] Delete error', error.message)
      return NextResponse.json({ error: 'Failed to delete format' }, { status: 500 })
    }
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Format not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Personal Brand Formats] Exception in DELETE', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
