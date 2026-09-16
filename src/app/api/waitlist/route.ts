import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/src/lib/supabase/server'
import { sendWaitlistConfirmationEmail } from '@/src/lib/email/resend'
import { validateWaitlistInput } from '@/src/lib/waitlist/validate'

const WAITLIST_SOURCE = 'not4normal_website'
// Postgres unique_violation
const UNIQUE_VIOLATION_CODE = '23505'

export async function POST(request: NextRequest) {
  try {
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

    const { error: insertError } = await supabaseServer.from('waitlist').insert({
      email,
      instagram_username: instagramUsername,
      first_name: firstName || null,
      source: WAITLIST_SOURCE,
    })

    if (insertError) {
      if (insertError.code === UNIQUE_VIOLATION_CODE) {
        return NextResponse.json({
          success: true,
          duplicate: true,
          message: "You're already on the waitlist.",
        })
      }

      console.error('[Waitlist] Failed to insert row', insertError.message)
      return NextResponse.json(
        { error: 'We could not join you to the waitlist right now. Please try again.' },
        { status: 500 }
      )
    }

    // Best-effort — a failed confirmation email should never fail the signup
    // itself, since the row is already saved.
    sendWaitlistConfirmationEmail({ email, firstName: firstName || undefined }).catch((error) => {
      console.error('[Waitlist] Confirmation email failed', error)
    })

    return NextResponse.json({ success: true, message: "You're on the list." })
  } catch (error) {
    console.error('[Waitlist] Unexpected error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
