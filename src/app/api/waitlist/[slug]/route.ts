import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/src/lib/supabase/server'
import { sendWaitlistConfirmationEmail } from '@/src/lib/email/resend'
import { normalizeSource, validateWaitlistInput } from '@/src/lib/waitlist/validate'
import type { Waitlist } from '@/src/types/waitlist'

// Postgres unique_violation
const UNIQUE_VIOLATION_CODE = '23505'
const DEFAULT_SOURCE = 'waitlist_page'

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug ? decodeURIComponent(params.slug) : ''
    if (!slug) {
      return NextResponse.json({ error: 'Missing waitlist' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const validation = validateWaitlistInput({
      email: body.email,
      instagramUsername: body.instagramUsername,
      firstName: body.firstName,
    })

    if (!validation.value) {
      return NextResponse.json(
        {
          error: 'Check your details and try again.',
          fieldErrors: validation.fieldErrors,
        },
        { status: 400 }
      )
    }

    const { email, instagramUsername, firstName } = validation.value

    // Resolve the waitlist server-side from the trusted route slug —
    // never trust a client-provided waitlist id for this.
    const { data: waitlistRow, error: waitlistError } = await supabaseServer
      .from('waitlists')
      .select('id, name, status')
      .eq('slug', slug)
      .maybeSingle()

    const waitlist = waitlistRow as Pick<Waitlist, 'id' | 'name' | 'status'> | null

    if (waitlistError) {
      console.error('[Waitlist] Failed to resolve waitlist by slug', waitlistError.message)
      return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
    }

    if (!waitlist) {
      return NextResponse.json({ error: 'This waitlist does not exist.' }, { status: 404 })
    }

    if (waitlist.status === 'draft') {
      return NextResponse.json({ error: "This waitlist isn't open yet." }, { status: 403 })
    }

    if (waitlist.status === 'closed') {
      return NextResponse.json({ error: 'This waitlist is currently closed.' }, { status: 403 })
    }

    const source = normalizeSource(body.source, DEFAULT_SOURCE)

    const { error: insertError } = await supabaseServer.from('waitlist_entries').insert({
      waitlist_id: waitlist.id,
      email,
      instagram_username: instagramUsername,
      first_name: firstName || null,
      source,
    })

    if (insertError) {
      if (insertError.code === UNIQUE_VIOLATION_CODE) {
        return NextResponse.json({
          success: true,
          duplicate: true,
          message: "You're already on this waitlist.",
        })
      }

      console.error('[Waitlist] Failed to insert entry', insertError.message)
      return NextResponse.json(
        { error: 'We could not join you to the waitlist right now. Please try again.' },
        { status: 500 }
      )
    }

    // Best-effort — a failed confirmation email should never fail the signup
    // itself, since the entry is already saved.
    sendWaitlistConfirmationEmail({
      email,
      firstName: firstName || undefined,
      waitlistName: waitlist.name,
    }).catch((error) => {
      console.error('[Waitlist] Confirmation email failed', error)
    })

    return NextResponse.json({ success: true, message: "You're on the list." })
  } catch (error) {
    console.error('[Waitlist] Unexpected error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
