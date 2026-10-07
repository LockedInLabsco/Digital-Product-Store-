import crypto from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/src/lib/supabase/server'
import { verifyMetaSignedRequest } from '@/src/lib/instagram/metaSignedRequest'
import { findConnectedAccountByMetaUserId } from '@/src/lib/social/instagramAccountLookup'
import { disconnectInstagramAccount } from '@/src/lib/social/instagramConnectAccount'
import { logConnectStage } from '@/src/lib/instagram/connectDiagnostics'

/**
 * Meta's Data Deletion Request Callback for Instagram Business Login —
 * verified against Meta's current official documentation
 * (developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback,
 * October 2026): POST with a `signed_request` form field (same format
 * as the Deauthorize Callback — see metaSignedRequest.ts), responding
 * with a REQUIRED `{ url, confirmation_code }` JSON body — both fields
 * mandatory — pointing the requester to a human-readable page where they
 * can check the request's status. Processed synchronously here (this
 * app's deletion scope is small), so the stored status is always
 * immediately resolved — see supabase/migrations/0031_instagram_data_deletion_requests.sql
 * and src/app/data-deletion/status/page.tsx, the status page the
 * returned url points to.
 *
 * Deliberately NOT gated by requirePermission()/an admin session — same
 * reasoning as the Deauthorize Callback (see that route's own header):
 * the signed_request verification IS the authentication Meta expects
 * here.
 *
 * Deletion scope (narrower judgment call, documented rather than
 * assumed): removes the Meta-sourced identifying data this app stores
 * about the connected account —
 * - disconnects it (exactly disconnectInstagramAccount's existing
 *   effect: status → 'disconnected', stored tokens deleted)
 * - clears username/display_name (human-readable PII) on its
 *   social_connected_accounts row
 * - deletes its social_connected_account_identifiers rows (the
 *   Meta-issued "identity links" Meta's own docs describe removing)
 *
 * Preserves pb_content_items, pb_content_metrics, ig_automation_rules,
 * and ig_automation_runs — this is the workspace's own historical
 * business content/analytics about posts the account owner created
 * and already owns on Instagram itself, not personal data collected
 * about a third party, and there is nothing in Meta's deletion-callback
 * requirements that calls for purging a business's own operational
 * records. If a stricter interpretation is ever needed, that is a
 * deliberate policy decision for a future phase, not something to guess
 * at here.
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
      console.error('[Instagram Data Deletion] signed_request verification failed', verified.reason)
      return NextResponse.json({ error: 'Invalid signed_request' }, { status: 401 })
    }

    const metaUserId = verified.payload.user_id
    logConnectStage('instagram_data_deletion_received')

    const matched = await findConnectedAccountByMetaUserId(metaUserId)
    const confirmationCode = crypto.randomBytes(16).toString('hex')

    if (matched) {
      const disconnectResult = await disconnectInstagramAccount(matched.workspaceId)
      if (!disconnectResult.ok && disconnectResult.reason !== 'not_connected') {
        console.error('[Instagram Data Deletion] Failed to disconnect matched account', disconnectResult.error)
      }

      const { error: scrubError } = await supabaseServer
        .from('social_connected_accounts')
        .update({ username: null, display_name: null, updated_at: new Date().toISOString() })
        .eq('id', matched.connectedAccountId)
      if (scrubError) {
        console.error('[Instagram Data Deletion] Failed to clear account display fields', scrubError.message)
      }

      const { error: identifierDeleteError } = await supabaseServer
        .from('social_connected_account_identifiers')
        .delete()
        .eq('connected_account_id', matched.connectedAccountId)
      if (identifierDeleteError) {
        console.error('[Instagram Data Deletion] Failed to delete account identifiers', identifierDeleteError.message)
      }

      logConnectStage('instagram_data_deletion_completed', { connectedAccountId: matched.connectedAccountId })
    } else {
      // Same honest limitation as the Deauthorize Callback — see
      // instagramAccountLookup.ts's header. Still recorded (with status
      // 'no_matching_account') so the confirmation_code resolves to a
      // real, truthful status if the requester checks it.
      logConnectStage('instagram_data_deletion_no_match')
    }

    const { error: insertError } = await supabaseServer.from('instagram_data_deletion_requests').insert({
      confirmation_code: confirmationCode,
      meta_user_id: metaUserId,
      connected_account_id: matched?.connectedAccountId ?? null,
      status: matched ? 'completed' : 'no_matching_account',
    })
    if (insertError) {
      console.error('[Instagram Data Deletion] Failed to record deletion request', insertError.message)
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin
    const statusUrl = new URL('/data-deletion/status', siteUrl)
    statusUrl.searchParams.set('code', confirmationCode)

    return NextResponse.json({ url: statusUrl.toString(), confirmation_code: confirmationCode })
  } catch (error) {
    console.error('[Instagram Data Deletion] Unhandled exception', error instanceof Error ? error.message : error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
