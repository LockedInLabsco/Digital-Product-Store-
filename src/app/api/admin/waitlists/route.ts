import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/src/lib/supabase/server'
import { requirePermission } from '@/src/lib/admin/auth'
import { isValidWaitlistSlug, parseScreenshotsInput } from '@/src/lib/waitlist/validate'
import { parseThemeConfigInput } from '@/src/lib/waitlist/theme'

const STATUS_VALUES = ['draft', 'active', 'closed']

// GET all waitlists (for admin listing), with a lead count per waitlist
export async function GET() {
  try {
    const auth = await requirePermission('waitlists:read')
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const { data, error } = await supabaseServer
      .from('waitlists')
      .select('*, entries:waitlist_entries(count)')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Admin Waitlists] Failed to fetch waitlists', error.message)
      return NextResponse.json({ error: 'Failed to fetch waitlists' }, { status: 500 })
    }

    const waitlists = (data || []).map((row: any) => {
      const { entries, ...waitlist } = row
      return { ...waitlist, entry_count: entries?.[0]?.count ?? 0 }
    })

    return NextResponse.json({ waitlists })
  } catch (error) {
    console.error('[Admin Waitlists] Exception in GET', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST create a new waitlist
export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission('waitlists:write')
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json().catch(() => ({}))
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const slug = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : ''
    const status = STATUS_VALUES.includes(body.status) ? body.status : 'draft'

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    if (!slug || !isValidWaitlistSlug(slug)) {
      return NextResponse.json(
        { error: 'Slug must be lowercase letters, numbers, and hyphens only (e.g. "phone-control-app")' },
        { status: 400 }
      )
    }

    const theme = parseThemeConfigInput(body.theme_config)
    if (!theme.value) {
      return NextResponse.json({ error: theme.error || 'Invalid theme' }, { status: 400 })
    }

    const screenshots = parseScreenshotsInput(body.screenshots)
    if (!screenshots.value) {
      return NextResponse.json({ error: screenshots.error || 'Invalid screenshots' }, { status: 400 })
    }

    const { data: existing } = await supabaseServer
      .from('waitlists')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: `A waitlist with the slug "${slug}" already exists. Please choose a different slug.` },
        { status: 409 }
      )
    }

    const { data, error } = await supabaseServer
      .from('waitlists')
      .insert({
        name,
        slug,
        description: body.description?.trim() || null,
        headline: body.headline?.trim() || null,
        supporting_text: body.supporting_text?.trim() || null,
        button_text: body.button_text?.trim() || null,
        status,
        theme_config: theme.value,
        screenshots: screenshots.value,
      })
      .select()
      .single()

    if (error) {
      console.error('[Admin Waitlists] Insert error', error.message)
      if (error.code === '23505') {
        return NextResponse.json(
          { error: `A waitlist with the slug "${slug}" already exists. Please choose a different slug.` },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: 'Failed to create waitlist' }, { status: 500 })
    }

    return NextResponse.json({ waitlist: data }, { status: 201 })
  } catch (error) {
    console.error('[Admin Waitlists] Exception in POST', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
