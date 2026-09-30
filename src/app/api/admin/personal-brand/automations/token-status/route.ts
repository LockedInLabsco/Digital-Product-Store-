import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/src/lib/admin/auth'
import { getMessagingTokenStatus, reconnectMessagingTokenFromEnv, refreshMessagingTokenIfDue } from '@/src/lib/instagram/tokenStore'

// GET the current Instagram messaging token's status — safe fields only
// (expiry, refresh status/error text, never the token) — shown as the
// integration status panel on /admin/personal-brand/automations.
export async function GET() {
  try {
    const auth = await requirePermission('personal_brand:read')
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const status = await getMessagingTokenStatus()
    return NextResponse.json({ status })
  } catch (error) {
    console.error('[Instagram Token Status] Exception in GET', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST triggers an immediate manual refresh (the admin "Refresh token"
// button) — still subject to Meta's real 24h-minimum-age rule (see
// tokenStore.refreshMessagingTokenIfDue), just not the 10-day proactive
// threshold the daily cron otherwise waits for. Pass { reconnect: true }
// for the "Reconnect Instagram" action instead, which re-seeds from
// whatever INSTAGRAM_MESSAGING_ACCESS_TOKEN currently holds.
export async function POST(request: NextRequest) {
  try {
    const auth = await requirePermission('personal_brand:write')
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body = await request.json().catch(() => ({}))
    const outcome = body?.reconnect === true ? await reconnectMessagingTokenFromEnv() : await refreshMessagingTokenIfDue({ force: true })
    return NextResponse.json(outcome)
  } catch (error) {
    console.error('[Instagram Token Status] Exception in POST', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
