import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/src/lib/supabase/server'
import { isAdminRequest } from '@/src/lib/admin/auth'
import { isValidWaitlistSlug } from '@/src/lib/waitlist/validate'

const STATUS_VALUES = ['draft', 'active', 'closed']

// GET single waitlist, with its lead count
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isAdminRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabaseServer
      .from('waitlists')
      .select('*, entries:waitlist_entries(count)')
      .eq('id', params.id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Waitlist not found' }, { status: 404 })
    }

    const { entries, ...waitlist } = data as any
    return NextResponse.json({ waitlist: { ...waitlist, entry_count: entries?.[0]?.count ?? 0 } })
  } catch (error) {
    console.error('[Admin Waitlists] Exception in GET by id', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT update waitlist
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isAdminRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const id = params.id

    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : ''

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    if (!slug || !isValidWaitlistSlug(slug)) {
      return NextResponse.json(
        { error: 'Slug must be lowercase letters, numbers, and hyphens only (e.g. "phone-control-app")' },
        { status: 400 }
      )
    }

    if (!STATUS_VALUES.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const { data: existing } = await supabaseServer
      .from('waitlists')
      .select('id')
      .eq('slug', slug)
      .neq('id', id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: `A waitlist with the slug "${slug}" already exists. Please choose a different slug.` },
        { status: 409 }
      )
    }

    const { data, error } = await supabaseServer
      .from('waitlists')
      .update({
        name,
        slug,
        description: body.description?.trim() || null,
        headline: body.headline?.trim() || null,
        supporting_text: body.supporting_text?.trim() || null,
        button_text: body.button_text?.trim() || null,
        status: body.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .maybeSingle()

    if (error) {
      console.error('[Admin Waitlists] Update error', error.message)
      if (error.code === '23505') {
        return NextResponse.json(
          { error: `A waitlist with the slug "${slug}" already exists. Please choose a different slug.` },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: 'Failed to update waitlist' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Waitlist not found' }, { status: 404 })
    }

    return NextResponse.json({ waitlist: data })
  } catch (error) {
    console.error('[Admin Waitlists] Exception in PUT', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE waitlist (cascades to its entries via the foreign key)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isAdminRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabaseServer
      .from('waitlists')
      .delete()
      .eq('id', params.id)
      .select()

    if (error) {
      console.error('[Admin Waitlists] Delete error', error.message)
      return NextResponse.json({ error: 'Failed to delete waitlist' }, { status: 500 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Waitlist not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Admin Waitlists] Exception in DELETE', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
