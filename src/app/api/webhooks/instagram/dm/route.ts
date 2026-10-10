import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/src/lib/instagram/webhookVerify'
import { processInstagramDmWebhookEntries } from '@/src/lib/instagram/webhookDmEventRouter'
import { logConnectStage } from '@/src/lib/instagram/connectDiagnostics'

/**
 * N4N DM Automations webhook — fully isolated from
 * src/app/api/webhooks/instagram/route.ts (the existing, working
 * webhook for the Direct Instagram Login app), per the repository
 * audit's §23 recommendation: a brand-new Meta App's signature is never
 * accepted on the production endpoint the existing comment/DM
 * automation already depends on. This route verifies ONLY
 * INSTAGRAM_DM_APP_SECRET (never INSTAGRAM_LOGIN_APP_SECRET or
 * INSTAGRAM_APP_SECRET), then reuses the SAME shared account-resolution
 * and automation-engine functions the existing route uses
 * (resolveConnectedAccountFromWebhookEntryId, processTrigger, rule
 * matching, run dedupe) via src/lib/instagram/webhookDmEventRouter.ts —
 * there is no second automation engine here, only a second, isolated
 * ingress point into the same one.
 *
 * Does NOT modify src/app/api/webhooks/instagram/route.ts in any way.
 */

// GET — Meta's one-time webhook verification handshake for the N4N DM
// Automations app's own Webhooks product config. Deliberately checks
// ONLY INSTAGRAM_DM_WEBHOOK_VERIFY_TOKEN — the verify token is NOT the
// App Secret, and NOT the existing INSTAGRAM_WEBHOOK_VERIFY_TOKEN used
// by the legacy/Direct-Login route; this app gets its own.
export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get('hub.mode')
  const token = request.nextUrl.searchParams.get('hub.verify_token')
  const challenge = request.nextUrl.searchParams.get('hub.challenge')
  const expectedToken = process.env.INSTAGRAM_DM_WEBHOOK_VERIFY_TOKEN

  // Never logs the token values themselves, only these booleans — same
  // convention as the existing route's GET handler.
  const tokenMatched = Boolean(token && expectedToken && token === expectedToken)
  logConnectStage('instagram_dm_webhook_verify_attempt', {
    mode,
    tokenPresent: Boolean(token),
    expectedTokenConfigured: Boolean(expectedToken),
    tokenMatched,
    challengePresent: Boolean(challenge),
  })

  if (mode === 'subscribe' && tokenMatched && challenge) {
    logConnectStage('instagram_dm_webhook_verify_success')
    return new NextResponse(challenge, { status: 200 })
  }

  logConnectStage('instagram_dm_webhook_verify_failure')
  return new NextResponse('Forbidden', { status: 403 })
}

// POST — every comment/message/story-reply event delivered through the
// N4N DM Automations app's webhook subscription. Reads the raw body and
// verifies the signature BEFORE any JSON parsing — same contract as the
// existing route — but against ONLY INSTAGRAM_DM_APP_SECRET via the
// shared, already-constant-time verifyWebhookSignature helper (not
// verifyInstagramWebhookSignature, which also accepts the OTHER two
// apps' secrets — using that here would defeat the isolation this route
// exists for). Always responds 200 once the signature is valid, even if
// nothing matched — dedupe is handled downstream by processTrigger's
// unique constraint, not by the HTTP status.
export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-hub-signature-256')
  const appSecret = process.env.INSTAGRAM_DM_APP_SECRET

  const signatureValid = verifyWebhookSignature(rawBody, signature, appSecret || '')
  if (!signatureValid) {
    logConnectStage('instagram_dm_webhook_signature_invalid', {})
    console.error('[Instagram DM Webhook] Invalid signature — rejecting request')
    return new NextResponse('Invalid signature', { status: 401 })
  }
  logConnectStage('instagram_dm_webhook_signature_valid', {})

  const payload = JSON.parse(rawBody)
  const entries: any[] = payload.entry || []

  await processInstagramDmWebhookEntries(entries, payload.object)

  return NextResponse.json({ received: true })
}
