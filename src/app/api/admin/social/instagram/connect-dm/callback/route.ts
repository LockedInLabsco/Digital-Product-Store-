import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/src/lib/admin/auth'
import { getSocialWorkspaceScope, canWriteWorkspace } from '@/src/lib/admin/socialWorkspaceScope'
import { consumeInstagramOAuthState } from '@/src/lib/social/instagramOAuthState'
import {
  exchangeCodeForInstagramDmToken,
  exchangeForLongLivedInstagramDmToken,
  fetchInstagramDmProfile,
} from '@/src/lib/instagram/instagramDmOAuth'
import { upsertConnectedInstagramAccount } from '@/src/lib/social/instagramConnectAccount'
import { subscribeInstagramAccountToWebhooks } from '@/src/lib/instagram/client'
import { logConnectStage } from '@/src/lib/instagram/connectDiagnostics'

const RETURN_PATH = '/admin/personal-brand/content'
const CALLBACK_PATH = '/api/admin/social/instagram/connect-dm/callback'
const FLOW = 'instagram_dm_connect' as const

/**
 * Mirrors src/app/api/admin/social/instagram/connect-direct/callback/route.ts's
 * ConnectErrorCode set and redirect contract exactly — same query param
 * names (`instagram_connect_error`, `instagram_attempted_account_id`,
 * `instagram_attempted_username`) so InstagramConnectionPanel's existing
 * already_connected_elsewhere / Request Access UI handles a DM-app
 * connect failure identically with zero UI changes.
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
  logConnectStage('instagram_dm_oauth_failure', { code })
  const url = new URL(RETURN_PATH, siteOrigin(request))
  url.searchParams.set('instagram_error', message)
  url.searchParams.set('instagram_connect_error', code)
  if (extraParams) {
    for (const [key, value] of Object.entries(extraParams)) url.searchParams.set(key, value)
  }
  return NextResponse.redirect(url)
}

function redirectToLogin(request: NextRequest, code: ConnectErrorCode): NextResponse {
  logConnectStage('instagram_dm_oauth_failure', { code })
  const url = new URL('/admin/login', siteOrigin(request))
  url.searchParams.set('instagram_connect_error', code)
  return NextResponse.redirect(url)
}

function redirectWithSuccess(request: NextRequest, outcome: 'connected' | 'reconnected' | 'replaced', details?: { previousUsername?: string | null; newUsername?: string | null }): NextResponse {
  logConnectStage('instagram_dm_oauth_success', { outcome })
  const url = new URL(RETURN_PATH, siteOrigin(request))
  url.searchParams.set('instagram', outcome)
  if (outcome === 'replaced') {
    if (details?.previousUsername) url.searchParams.set('instagram_previous_username', details.previousUsername)
    if (details?.newUsername) url.searchParams.set('instagram_new_username', details.newUsername)
  }
  return NextResponse.redirect(url)
}

// GET — Meta redirects the browser here after the N4N DM Automations
// app's Instagram Login consent screen. Same contract as
// connect-direct/callback: every exit is a redirect with a safe error
// code, nothing is written until state + session + workspace role are
// all re-verified. Purely additive — does not modify connect-direct/callback.
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

    const shortLived = await exchangeCodeForInstagramDmToken({ code, redirectUri })
    if (!shortLived.ok) {
      return redirectWithError(request, 'token_exchange_failed', 'Instagram authorization failed while exchanging the authorization code. Please try connecting again.')
    }
    logConnectStage('instagram_dm_short_lived_exchange_success')

    const longLived = await exchangeForLongLivedInstagramDmToken(shortLived.data.accessToken)
    if (!longLived.ok) {
      // longLived.error is already Meta's own sanitized error message
      // (never a token/secret) and safe to log.
      logConnectStage('instagram_dm_long_lived_exchange_failure', { reason: longLived.error })
      return redirectWithError(request, 'long_lived_exchange_failed', 'Instagram authorization failed while confirming your access. Please try connecting again.')
    }
    logConnectStage('instagram_dm_long_lived_exchange_success')

    const profile = await fetchInstagramDmProfile(longLived.data.accessToken)
    if (!profile.ok) {
      return redirectWithError(request, 'profile_fetch_failed', 'Failed to look up your Instagram account. Please try connecting again.')
    }
    logConnectStage('instagram_dm_profile_lookup_success')
    logConnectStage('instagram_dm_account_type', { accountType: profile.data.accountType })

    // Defense-in-depth only — same convention as connect-direct/callback.
    const accountType = (profile.data.accountType || '').toLowerCase()
    if (accountType && accountType !== 'business' && accountType !== 'media_creator' && accountType !== 'creator') {
      return redirectWithError(
        request,
        'not_professional_account',
        'This Instagram account is a personal account. Switch it to a Professional (Business or Creator) account in the Instagram app, then try connecting again.'
      )
    }

    // Reuses the SAME account merge/dedup helper connect-direct/callback
    // uses — provider='instagram_dm' is the only difference. If this
    // Instagram professional account id already has an instagram_login
    // (or facebook_login) connection for this workspace, this lands on
    // the reauthorize path and adds a second/third social_account_tokens
    // row to the SAME canonical social_connected_accounts row — it does
    // NOT create a duplicate connected account. See
    // instagramConnectAccount.ts's own header for the full contract.
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
      'instagram_dm'
    )

    if (!upsertResult.ok) {
      if (upsertResult.reason === 'already_connected_elsewhere') {
        return redirectWithError(request, 'already_connected_elsewhere', upsertResult.error, {
          instagram_attempted_account_id: profile.data.instagramAccountId,
          instagram_attempted_username: profile.data.username || '',
        })
      }
      return redirectWithError(request, 'account_save_failed', upsertResult.error)
    }

    logConnectStage(upsertResult.reauthorized ? 'instagram_dm_account_reauthorized' : 'instagram_dm_account_connected', {
      connectedAccountId: upsertResult.connectedAccountId,
    })

    // Required on top of the app-level Dashboard field checkboxes — see
    // subscribeInstagramAccountToWebhooks's own doc comment. Takes
    // whichever access token is passed in, with no App-specific
    // branching, so this works unmodified against the N4N DM
    // Automations app's own token. Runs on every successful connect AND
    // reauthorize/reconnect. Never fatal: a transient failure here must
    // not undo an otherwise successful connect.
    const subscribeResult = await subscribeInstagramAccountToWebhooks(longLived.data.accessToken)
    logConnectStage(subscribeResult.ok ? 'instagram_dm_webhook_subscribe_success' : 'instagram_dm_webhook_subscribe_failure', {
      connectedAccountId: upsertResult.connectedAccountId,
      ...(subscribeResult.ok ? {} : { reason: subscribeResult.error }),
    })

    if (upsertResult.replacedPreviousAccount) {
      return redirectWithSuccess(request, 'replaced', { previousUsername: upsertResult.previousUsername, newUsername: profile.data.username })
    }
    return redirectWithSuccess(request, upsertResult.reauthorized ? 'reconnected' : 'connected')
  } catch (error) {
    console.error('[Instagram DM Connect] Unhandled exception in callback', error instanceof Error ? error.message : error)
    return redirectWithError(request, 'unexpected_error', 'Something went wrong connecting Instagram. Please try again.')
  }
}
