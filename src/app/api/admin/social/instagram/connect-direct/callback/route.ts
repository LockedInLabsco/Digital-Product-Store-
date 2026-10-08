import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/src/lib/admin/auth'
import { getSocialWorkspaceScope, canWriteWorkspace } from '@/src/lib/admin/socialWorkspaceScope'
import { consumeInstagramOAuthState } from '@/src/lib/social/instagramOAuthState'
import {
  exchangeCodeForInstagramLoginToken,
  exchangeForLongLivedInstagramLoginToken,
  fetchInstagramLoginProfile,
} from '@/src/lib/instagram/instagramLoginOAuth'
import { upsertConnectedInstagramAccount } from '@/src/lib/social/instagramConnectAccount'
import { subscribeInstagramAccountToWebhooks } from '@/src/lib/instagram/client'
import { logConnectStage } from '@/src/lib/instagram/connectDiagnostics'

const RETURN_PATH = '/admin/personal-brand/content'
const CALLBACK_PATH = '/api/admin/social/instagram/connect-direct/callback'
const FLOW = 'instagram_login_connect' as const

/**
 * Mirrors src/app/api/admin/social/instagram/connect/callback/route.ts's
 * ConnectErrorCode set — deliberately the SAME codes/query param names
 * (`instagram_connect_error`, `instagram_attempted_account_id`,
 * `instagram_attempted_username`) as the Facebook flow, so
 * InstagramConnectionPanel's existing already_connected_elsewhere /
 * Request Access UI (built in Phase F) handles a direct-Instagram-Login
 * failure identically with ZERO changes to that component. A
 * `not_professional_account` code is added for the one failure mode
 * unique to this flow — Meta's docs are explicit that only a Business
 * or Creator account can even reach this consent screen, but the
 * account_type check below is kept as defense-in-depth, matching
 * selectInstagramAccount()'s own "never trust Meta to have enforced
 * this upstream" convention in facebookOAuth.ts.
 */
type ConnectErrorCode =
  | 'user_cancelled'
  | 'session_expired'
  | 'state_invalid'
  | 'state_expired'
  | 'state_lookup_failed'
  | 'session_mismatch'
  | 'workspace_permission_denied'
  | 'missing_code'
  | 'token_exchange_failed'
  | 'long_lived_exchange_failed'
  | 'profile_fetch_failed'
  | 'not_professional_account'
  | 'already_connected_elsewhere'
  | 'account_save_failed'
  | 'unexpected_error'

function siteOrigin(request: NextRequest): string {
  return process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin
}

function redirectWithError(request: NextRequest, code: ConnectErrorCode, message: string, extraParams?: Record<string, string>): NextResponse {
  logConnectStage('instagram_oauth_failure', { code })
  const url = new URL(RETURN_PATH, siteOrigin(request))
  url.searchParams.set('instagram_error', message)
  url.searchParams.set('instagram_connect_error', code)
  if (extraParams) {
    for (const [key, value] of Object.entries(extraParams)) url.searchParams.set(key, value)
  }
  return NextResponse.redirect(url)
}

function redirectToLogin(request: NextRequest, code: ConnectErrorCode): NextResponse {
  logConnectStage('instagram_oauth_failure', { code })
  const url = new URL('/admin/login', siteOrigin(request))
  url.searchParams.set('instagram_connect_error', code)
  return NextResponse.redirect(url)
}

function redirectWithSuccess(request: NextRequest, outcome: 'connected' | 'reconnected' | 'replaced', details?: { previousUsername?: string | null; newUsername?: string | null }): NextResponse {
  logConnectStage('instagram_oauth_success', { outcome })
  const url = new URL(RETURN_PATH, siteOrigin(request))
  url.searchParams.set('instagram', outcome)
  if (outcome === 'replaced') {
    if (details?.previousUsername) url.searchParams.set('instagram_previous_username', details.previousUsername)
    if (details?.newUsername) url.searchParams.set('instagram_new_username', details.newUsername)
  }
  return NextResponse.redirect(url)
}

// GET — Meta redirects the browser here after the Instagram Login
// consent screen. Same contract as the Facebook callback: every exit is
// a redirect with a safe error code, nothing is written until state +
// session + workspace role are all re-verified, and a failed
// already_connected_elsewhere attempt never writes a token anywhere
// (see upsertConnectedInstagramAccount's own early-return for that
// check, unchanged by Phase G).
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const stateParam = searchParams.get('state') || ''

    const metaError = searchParams.get('error')
    if (metaError) {
      if (stateParam) await consumeInstagramOAuthState(stateParam, FLOW)
      return redirectWithError(request, 'user_cancelled', 'Instagram authorization was cancelled. No changes were made.')
    }

    const auth = await requirePermission('personal_brand:write')
    if (!auth.ok) {
      return redirectToLogin(request, 'session_expired')
    }

    const consumed = await consumeInstagramOAuthState(stateParam, FLOW)
    if (!consumed.ok) {
      const code: ConnectErrorCode = consumed.reason === 'expired' ? 'state_expired' : consumed.reason === 'lookup_failed' ? 'state_lookup_failed' : 'state_invalid'
      return redirectWithError(request, code, consumed.error)
    }

    const scope = await getSocialWorkspaceScope()
    if (!scope || scope.adminUserId !== consumed.payload.adminUserId) {
      return redirectWithError(request, 'session_mismatch', "This Instagram connection request doesn't match your current session. Start over from Social Media.")
    }

    if (!canWriteWorkspace(scope, consumed.payload.workspaceId)) {
      return redirectWithError(request, 'workspace_permission_denied', 'You no longer have permission to connect Instagram for that Social Workspace.')
    }

    const code = searchParams.get('code')
    if (!code) {
      return redirectWithError(request, 'missing_code', 'Instagram did not return an authorization code. Please try connecting again.')
    }

    const redirectUri = new URL(CALLBACK_PATH, siteOrigin(request)).toString()

    const shortLived = await exchangeCodeForInstagramLoginToken({ code, redirectUri })
    if (!shortLived.ok) {
      return redirectWithError(request, 'token_exchange_failed', 'Instagram authorization failed while exchanging the authorization code. Please try connecting again.')
    }
    logConnectStage('instagram_short_lived_exchange_success')

    const longLived = await exchangeForLongLivedInstagramLoginToken(shortLived.data.accessToken)
    if (!longLived.ok) {
      // longLived.error is already Meta's own sanitized error message
      // (never a token/secret — see instagramLoginOAuth.ts's callMeta)
      // and safe to log, same as the message/type/code/fbtrace_id set
      // callMeta itself already logs on every Meta-side failure.
      logConnectStage('instagram_long_lived_exchange_failure', { reason: longLived.error })
      return redirectWithError(request, 'long_lived_exchange_failed', 'Instagram authorization failed while confirming your access. Please try connecting again.')
    }
    logConnectStage('instagram_long_lived_exchange_success')

    const profile = await fetchInstagramLoginProfile(longLived.data.accessToken)
    if (!profile.ok) {
      return redirectWithError(request, 'profile_fetch_failed', 'Failed to look up your Instagram account. Please try connecting again.')
    }
    logConnectStage('instagram_profile_lookup_success')
    // account_type (e.g. "Business"/"Media_Creator") is Meta's own
    // public field on the professional account being connected — never
    // a token/secret — and directly useful for diagnosing account-type
    // vs. app-access-level failures separately going forward.
    logConnectStage('instagram_account_type', { accountType: profile.data.accountType })

    // Defense-in-depth only — Meta's own consent screen for this product
    // should never let a Personal account reach this point (see
    // instagramLoginOAuth.ts's InstagramLoginProfile doc comment), but
    // this never trusts that upstream enforcement alone.
    const accountType = (profile.data.accountType || '').toLowerCase()
    if (accountType && accountType !== 'business' && accountType !== 'media_creator' && accountType !== 'creator') {
      return redirectWithError(
        request,
        'not_professional_account',
        'This Instagram account is a personal account. Switch it to a Professional (Business or Creator) account in the Instagram app, then try connecting again.'
      )
    }

    const upsertResult = await upsertConnectedInstagramAccount(
      consumed.payload.workspaceId,
      consumed.payload.adminUserId,
      {
        instagramAccountId: profile.data.instagramAccountId,
        username: profile.data.username,
        displayName: profile.data.name,
        pageAccessToken: longLived.data.accessToken,
        tokenExpiresAt: longLived.data.expiresAt,
      },
      'instagram_login'
    )

    if (!upsertResult.ok) {
      if (upsertResult.reason === 'already_connected_elsewhere') {
        // Same safe-fields-only contract as the Facebook callback's
        // equivalent branch — only Meta's own account id + the username
        // this admin just saw on Instagram's own consent screen cross
        // the response boundary, never an internal workspace/account
        // UUID. See src/lib/social/accessRequests.ts for how Request
        // Access re-resolves the target workspace from this id itself.
        return redirectWithError(request, 'already_connected_elsewhere', upsertResult.error, {
          instagram_attempted_account_id: profile.data.instagramAccountId,
          instagram_attempted_username: profile.data.username || '',
        })
      }
      return redirectWithError(request, 'account_save_failed', upsertResult.error)
    }

    logConnectStage(upsertResult.reauthorized ? 'instagram_account_reauthorized' : 'instagram_account_connected', {
      connectedAccountId: upsertResult.connectedAccountId,
    })

    // Required on top of the app-level Dashboard field checkboxes —
    // see subscribeInstagramAccountToWebhooks's own doc comment. Runs
    // on every successful connect AND reauthorize/reconnect, so simply
    // clicking "Reconnect" on an already-connected account retroactively
    // applies this to accounts that connected before this existed.
    // Never fatal: a transient failure here must not undo an otherwise
    // successful connect — it's reported, and the existing webhook
    // automations just won't fire for this account until it succeeds
    // (retried on the next reconnect).
    const subscribeResult = await subscribeInstagramAccountToWebhooks(longLived.data.accessToken)
    logConnectStage(subscribeResult.ok ? 'instagram_webhook_subscribe_success' : 'instagram_webhook_subscribe_failure', {
      connectedAccountId: upsertResult.connectedAccountId,
      ...(subscribeResult.ok ? {} : { reason: subscribeResult.error }),
    })

    if (upsertResult.replacedPreviousAccount) {
      return redirectWithSuccess(request, 'replaced', { previousUsername: upsertResult.previousUsername, newUsername: profile.data.username })
    }
    return redirectWithSuccess(request, upsertResult.reauthorized ? 'reconnected' : 'connected')
  } catch (error) {
    console.error('[Instagram Login Connect] Unhandled exception in callback', error instanceof Error ? error.message : error)
    return redirectWithError(request, 'unexpected_error', 'Something went wrong connecting Instagram. Please try again.')
  }
}
