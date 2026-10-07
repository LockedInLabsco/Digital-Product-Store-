import { NextRequest, NextResponse } from 'next/server'
import { verifyMetaSignedRequest } from '@/src/lib/instagram/metaSignedRequest'
import { findConnectedAccountByMetaUserId } from '@/src/lib/social/instagramAccountLookup'
import { disconnectInstagramAccount } from '@/src/lib/social/instagramConnectAccount'
import { logConnectStage } from '@/src/lib/instagram/connectDiagnostics'

/**
 * Meta's Deauthorize Callback for Instagram Business Login — called
 * directly by Meta's own servers (never a logged-in admin's browser),
 * the moment someone revokes this app's access from Instagram/Facebook
 * settings. POST with a `signed_request` form field is Meta's
 * documented, decade-stable mechanism for this callback (same
 * HMAC-SHA256 base64url format as the Data Deletion Request Callback —
 * see metaSignedRequest.ts); unlike that callback, Meta's docs do not
 * require any particular JSON body in response, only a successful HTTP
 * status, so a minimal body is returned here for diagnostic value only.
 *
 * Deliberately NOT gated by requirePermission()/an admin session — Meta
 * calls this unauthenticated from our app's perspective; verifying the
 * signed_request IS the authentication here, exactly as Meta's model
 * requires. Living under /api/admin/social/instagram/ is just this
 * app's existing URL namespace for everything Instagram-connection-
 * related, not an admin-auth boundary.
 *
 * Effect on a match: exactly src/lib/social/instagramConnectAccount.ts's
 * existing disconnectInstagramAccount() — status → 'disconnected',
 * stored tokens deleted. pb_content_items, pb_content_metrics,
 * ig_automation_rules, and ig_automation_runs are never touched (that
 * function already preserves them; see its own doc comment), and no
 * other workspace or connected account is ever touched, since the
 * lookup resolves exactly one connected_account_id (or none).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.formData().catch(() => null)
    const signedRequest = body?.get('signed_request')

    if (typeof signedRequest !== 'string' || !signedRequest) {
      return NextResponse.json({ error: 'Missing signed_request' }, { status: 400 })
    }

    const verified = verifyMetaSignedRequest(signedRequest)
    if (!verified.ok) {
      // Never log the raw signed_request itself — only the safe,
      // structural reason verification failed.
      console.error('[Instagram Deauthorize] signed_request verification failed', verified.reason)
      return NextResponse.json({ error: 'Invalid signed_request' }, { status: 401 })
    }

    const metaUserId = verified.payload.user_id
    logConnectStage('instagram_deauthorize_received')

    const matched = await findConnectedAccountByMetaUserId(metaUserId)
    if (!matched) {
      // Honest, documented limitation — see instagramAccountLookup.ts's
      // own header. Still a successful callback from Meta's point of
      // view: nothing here is "wrong," we simply have no stored mapping
      // to act on. Logged with the Meta-issued id only (not secret —
      // the same identifier class already stored throughout
      // social_connected_account_identifiers), never a guess at which
      // account to disconnect instead.
      logConnectStage('instagram_deauthorize_no_match')
      return NextResponse.json({ status: 'ok' })
    }

    const result = await disconnectInstagramAccount(matched.workspaceId)
    if (!result.ok && result.reason !== 'not_connected') {
      console.error('[Instagram Deauthorize] Failed to disconnect matched account', result.error)
      // Still acknowledge Meta's callback — a local write failure here
      // must not make Meta believe the callback itself is broken and
      // retry/escalate; the account can also be disconnected manually.
      return NextResponse.json({ status: 'ok' })
    }

    logConnectStage('instagram_deauthorize_completed', { connectedAccountId: matched.connectedAccountId })
    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('[Instagram Deauthorize] Unhandled exception', error instanceof Error ? error.message : error)
    return NextResponse.json({ status: 'ok' })
  }
}
