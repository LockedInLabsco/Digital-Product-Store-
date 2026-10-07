import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/src/lib/admin/auth'
import { getSocialWorkspaceScope, canWriteWorkspace } from '@/src/lib/admin/socialWorkspaceScope'
import { consumeInstagramOAuthState } from '@/src/lib/social/instagramOAuthState'
import {
  exchangeCodeForUserToken,
  exchangeForLongLivedUserToken,
  fetchGrantedPermissions,
  fetchPagesWithInstagramAccounts,
  getPermissionStatus,
  selectInstagramAccount,
} from '@/src/lib/instagram/facebookOAuth'
import { upsertConnectedInstagramAccount } from '@/src/lib/social/instagramConnectAccount'
import { logConnectStage } from '@/src/lib/instagram/connectDiagnostics'

const RETURN_PATH = '/admin/personal-brand/content'
const CALLBACK_PATH = '/api/admin/social/instagram/connect/callback'

/**
 * Short, stable, non-sensitive codes surfaced to the browser as
 * `instagram_connect_error` — safe to appear in a URL/server log, never
 * Meta's raw response text or anything secret. The existing
 * `instagram_error` param (a human-readable sentence, already read by
 * InstagramConnectionPanel) is kept unchanged alongside it on every
 * redirect below, so the current UI needs no changes.
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
  | 'pages_fetch_failed'
  | 'no_pages'
  | 'business_access_declined'
  | 'no_instagram_account'
  | 'multiple_accounts'
  | 'already_connected_elsewhere'
  | 'account_save_failed'
  | 'unexpected_error'

function siteOrigin(request: NextRequest): string {
  return process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin
}

/**
 * Every error exit funnels through here — the single chokepoint that
 * logs the production-safe `oauth_callback_failure` event. The earlier,
 * much noisier per-branch diagnostic logs (callback_received,
 * meta_denied, state_consume_failed, session_mismatch, ...) have been
 * removed now that the business_management root cause is fixed: the
 * error code alone (already distinct per branch) identifies which
 * branch fired, so a separate log line per branch was redundant.
 */
function redirectWithError(request: NextRequest, code: ConnectErrorCode, message: string, extraParams?: Record<string, string>): NextResponse {
  logConnectStage('oauth_callback_failure', { code })
  const url = new URL(RETURN_PATH, siteOrigin(request))
  url.searchParams.set('instagram_error', message)
  url.searchParams.set('instagram_connect_error', code)
  if (extraParams) {
    for (const [key, value] of Object.entries(extraParams)) url.searchParams.set(key, value)
  }
  return NextResponse.redirect(url)
}

function redirectToLogin(request: NextRequest, code: ConnectErrorCode): NextResponse {
  logConnectStage('oauth_callback_failure', { code })
  const url = new URL('/admin/login', siteOrigin(request))
  url.searchParams.set('instagram_connect_error', code)
  return NextResponse.redirect(url)
}

function redirectWithSuccess(
  request: NextRequest,
  outcome: 'connected' | 'reconnected' | 'replaced',
  details?: { previousUsername?: string | null; newUsername?: string | null }
): NextResponse {
  logConnectStage('oauth_callback_success', { outcome })
  const url = new URL(RETURN_PATH, siteOrigin(request))
  url.searchParams.set('instagram', outcome)
  if (outcome === 'replaced') {
    if (details?.previousUsername) url.searchParams.set('instagram_previous_username', details.previousUsername)
    if (details?.newUsername) url.searchParams.set('instagram_new_username', details.newUsername)
  }
  return NextResponse.redirect(url)
}

// GET — Meta redirects the browser here after the consent screen, with
// either `?code=...&state=...` (authorized) or `?error=...&state=...`
// (denied/cancelled). Every exit path is a redirect, never a JSON
// response (top-level browser navigation, not a fetch call), and every
// exit path carries a safe `instagram_connect_error`/`instagram`
// outcome code.
//
// Nothing is written to the database until every one of these has
// succeeded: state popped + validated, current session matches the
// admin/workspace the flow was started for, code exchanged, long-lived
// token obtained, exactly one linked Instagram account resolved. Any
// failure before upsertConnectedInstagramAccount leaves zero partial
// state — there is no "half-connected" account possible.
//
// Wrapped in a top-level try/catch: an uncaught exception anywhere in
// this handler always redirects back with `unexpected_error` instead of
// a bare framework error page.
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const stateParam = searchParams.get('state') || ''

    // The admin declined Meta's consent screen (or Meta itself errored) —
    // non-destructive: best-effort consume the state purely to avoid
    // leaving it around for reuse, but the outcome either way is the same
    // friendly "cancelled" redirect, never an error page.
    const metaError = searchParams.get('error')
    if (metaError) {
      if (stateParam) await consumeInstagramOAuthState(stateParam)
      return redirectWithError(request, 'user_cancelled', 'Instagram authorization was cancelled. No changes were made.')
    }

    const auth = await requirePermission('personal_brand:write')
    if (!auth.ok) {
      return redirectToLogin(request, 'session_expired')
    }

    const consumed = await consumeInstagramOAuthState(stateParam)
    if (!consumed.ok) {
      const code: ConnectErrorCode = consumed.reason === 'expired' ? 'state_expired' : consumed.reason === 'lookup_failed' ? 'state_lookup_failed' : 'state_invalid'
      return redirectWithError(request, code, consumed.error)
    }

    // The security-critical check: the state proves someone (adminUserId)
    // started this flow for a specific workspace — this proves the
    // CURRENTLY authenticated admin is that same person, not merely "some
    // logged-in admin." Without this, a state leaked or replayed from a
    // different admin's browser would silently connect an account into
    // that other admin's workspace.
    const scope = await getSocialWorkspaceScope()
    if (!scope || scope.adminUserId !== consumed.payload.adminUserId) {
      return redirectWithError(request, 'session_mismatch', "This Instagram connection request doesn't match your current session. Start over from Social Media.")
    }

    // Re-checked independently of the state payload itself — role/
    // membership could have changed in the (short) window between
    // starting the flow and Meta redirecting back.
    if (!canWriteWorkspace(scope, consumed.payload.workspaceId)) {
      return redirectWithError(request, 'workspace_permission_denied', 'You no longer have permission to connect Instagram for that Social Workspace.')
    }

    const code = searchParams.get('code')
    if (!code) {
      return redirectWithError(request, 'missing_code', 'Instagram did not return an authorization code. Please try connecting again.')
    }

    const redirectUri = new URL(CALLBACK_PATH, siteOrigin(request)).toString()

    const shortLived = await exchangeCodeForUserToken({ code, redirectUri })
    if (!shortLived.ok) {
      return redirectWithError(request, 'token_exchange_failed', 'Instagram authorization failed while exchanging the authorization code. Please try connecting again.')
    }

    const longLived = await exchangeForLongLivedUserToken(shortLived.data.accessToken)
    if (!longLived.ok) {
      return redirectWithError(request, 'long_lived_exchange_failed', 'Instagram authorization failed while confirming your access. Please try connecting again.')
    }

    // Non-blocking: a failure here must never change what happens next
    // (selectInstagramAccount's own decision logic is unchanged either
    // way). The one thing the captured result IS used for below is
    // picking a more specific error message if /me/accounts comes back
    // empty — Meta never reports a declined permission through the
    // OAuth callback itself, only this endpoint does, and
    // business_management is the scope most likely to be silently
    // declined for a Page managed through a Business Portfolio (see
    // CONTENT_OAUTH_SCOPES's own comment in facebookOAuth.ts).
    const grantedPermissionsResult = await fetchGrantedPermissions(longLived.data.accessToken)

    const pagesResult = await fetchPagesWithInstagramAccounts(longLived.data.accessToken)
    if (!pagesResult.ok) {
      return redirectWithError(request, 'pages_fetch_failed', 'Failed to look up your Facebook Pages. Please try connecting again.')
    }

    if (pagesResult.data.totalPageCount === 0) {
      // No separate/alternate Page-discovery endpoint exists to fall
      // back to here — verified directly against Meta's current Graph
      // API `User` node reference, which lists only the `accounts` edge
      // (i.e. /me/accounts, already called above) for this purpose. The
      // only thing that can legitimately explain zero Pages at this
      // point is either a genuine lack of access, or — specifically for
      // a Business-Manager-assigned Page — business_management having
      // been declined on this authorization. Distinguish the two so the
      // admin isn't told the generic, less actionable "no_pages" when
      // the real, fixable cause is a declined permission.
      const businessManagementStatus = grantedPermissionsResult.ok ? getPermissionStatus(grantedPermissionsResult.data, 'business_management') : 'unknown'

      if (businessManagementStatus === 'declined') {
        return redirectWithError(
          request,
          'business_access_declined',
          'Facebook declined to grant Business Page access (business_management) during authorization. Reconnect and approve that permission when prompted.'
        )
      }

      return redirectWithError(
        request,
        'no_pages',
        'No Facebook Page is linked to the account you authorized with. Connect a Facebook Page first, then try again.'
      )
    }

    const selected = selectInstagramAccount(pagesResult.data.pages)
    if (!selected.ok) {
      const code: ConnectErrorCode = selected.reason === 'ambiguous' ? 'multiple_accounts' : 'no_instagram_account'
      return redirectWithError(request, code, selected.error)
    }

    const upsertResult = await upsertConnectedInstagramAccount(consumed.payload.workspaceId, consumed.payload.adminUserId, {
      instagramAccountId: selected.page.instagramAccountId,
      username: selected.page.username,
      displayName: selected.page.name,
      pageAccessToken: selected.page.pageAccessToken,
      tokenExpiresAt: longLived.data.expiresAt,
    })

    if (!upsertResult.ok) {
      if (upsertResult.reason === 'already_connected_elsewhere') {
        // Only the Meta-side account id + its (public, already known to
        // this admin — they just picked it in Meta's own consent screen)
        // username cross the response boundary here — never our own
        // workspace_id/connected_account_id. The Request Access flow
        // (src/app/api/admin/social/instagram/request-access/route.ts)
        // re-resolves the owning workspace from this account id itself,
        // server-side, exactly like upsertConnectedInstagramAccount's own
        // lookup above — the browser never gets to name a workspace.
        return redirectWithError(request, 'already_connected_elsewhere', upsertResult.error, {
          instagram_attempted_account_id: selected.page.instagramAccountId,
          instagram_attempted_username: selected.page.username || '',
        })
      }
      return redirectWithError(request, 'account_save_failed', upsertResult.error)
    }

    if (upsertResult.replacedPreviousAccount) {
      return redirectWithSuccess(request, 'replaced', { previousUsername: upsertResult.previousUsername, newUsername: selected.page.username })
    }
    return redirectWithSuccess(request, upsertResult.reauthorized ? 'reconnected' : 'connected')
  } catch (error) {
    console.error('[Instagram Connect] Unhandled exception in callback', error instanceof Error ? error.message : error)
    return redirectWithError(request, 'unexpected_error', 'Something went wrong connecting Instagram. Please try again.')
  }
}
