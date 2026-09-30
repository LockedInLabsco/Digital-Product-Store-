import { NextRequest, NextResponse } from 'next/server'
import { refreshMessagingTokenIfDue } from '@/src/lib/instagram/tokenStore'

export const runtime = 'nodejs'

/**
 * Checks the stored Instagram Login messaging token daily and refreshes
 * it once it's within 10 days of expiry (see
 * REFRESH_THRESHOLD_DAYS in tokenStore.ts) — the automatic-renewal
 * counterpart to /api/cron/instagram-followups, protected the same way
 * (CRON_SECRET, since the caller is an external pinger, never a logged-in
 * admin). Never returns the token itself, only a status summary — see
 * docs/INSTAGRAM_AUTOMATIONS_SETUP.md for the recommended external
 * scheduler (the same one already pinging instagram-followups can hit
 * this route too, once a day instead of every 15-30 minutes).
 */
export async function GET(request: NextRequest) {
  const providedSecret = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || request.nextUrl.searchParams.get('secret')
  const expectedSecret = process.env.CRON_SECRET

  if (!expectedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const outcome = await refreshMessagingTokenIfDue()
  return NextResponse.json(outcome)
}
