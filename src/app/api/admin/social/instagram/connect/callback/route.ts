import { NextRequest, NextResponse } from 'next/server'
import { requirePermission } from '@/src/lib/admin/auth'
import { getSocialWorkspaceScope, canWriteWorkspace } from '@/src/lib/admin/socialWorkspaceScope'
import { consumeInstagramOAuthState } from '@/src/lib/social/instagramOAuthState'
import {
  exchangeCodeForUserToken,
  exchangeForLongLivedUserToken,
  fetchPagesWithInstagramAccounts,
  selectInstagramAccount,
} from '@/src/lib/instagram/facebookOAuth'
import { upsertConnectedInstagramAccount } from '@/src/lib/social/instagramConnectAccount'

const RETURN_PATH = '/admin/personal-brand/content'
const CALLBACK_PATH = '/api/admin/social/instagram/connect/callback'

function siteOrigin(request: NextRequest): string {
  return process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin
}

function redirectWithError(request: NextRequest, message: string): NextResponse {
  const url = new URL(RETURN_PATH, siteOrigin(request))
  url.searchParams.set('instagram_error', message)
  return NextResponse.redirect(url)
}

function redirectWithSuccess(request: NextRequest, outcome: 'connected' | 'reconnected' | 'replaced'): NextResponse {
  const url = new URL(RETURN_PATH, siteOrigin(request))
  url.searchParams.set('instagram', outcome)
  return NextResponse.redirect(url)
}

// GET — Meta redirects the browser here after the consent screen, with
// either `?code=...&state=...` (authorized) or `?error=...&state=...`
// (denied/cancelled). Every exit path is a redirect back to
// RETURN_PATH, never a JSON response — this is a top-level browser
// navigation, not a fetch call, and the whole point of a callback route
// is to land the admin back on a normal page with a clear outcome.
//
// Nothing is written to the database until every one of these has
// succeeded: state popped + validated, current session matches the
// admin/workspace the flow was started for, code exchanged, long-lived
// token obtained, exactly one linked Instagram account resolved. Any
// failure before upsertConnectedInstagramAccount leaves zero partial
// state — there is no "half-connected" account possible.
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const stateParam = searchParams.get('state') || ''

  // The admin declined Meta's consent screen (or Meta itself errored) —
  // non-destructive: best-effort consume the state purely to avoid
  // leaving it around for reuse, but the outcome either way is the same
  // friendly "cancelled" redirect, never an error page.
  const metaError = searchParams.get('error')
  if (metaError) {
    if (stateParam) await consumeInstagramOAuthState(stateParam)
    return redirectWithError(request, 'Instagram authorization was cancelled. No changes were made.')
  }

  const auth = await requirePermission('personal_brand:write')
  if (!auth.ok) {
    return NextResponse.redirect(new URL('/admin/login', siteOrigin(request)))
  }

  const consumed = await consumeInstagramOAuthState(stateParam)
  if (!consumed.ok) {
    return redirectWithError(request, consumed.error)
  }

  // The security-critical check: the state proves someone (adminUserId)
  // started this flow for a specific workspace — this proves the
  // CURRENTLY authenticated admin is that same person, not merely "some
  // logged-in admin." Without this, a state leaked or replayed from a
  // different admin's browser would silently connect an account into
  // that other admin's workspace.
  const scope = await getSocialWorkspaceScope()
  if (!scope || scope.adminUserId !== consumed.payload.adminUserId) {
    return redirectWithError(request, "This Instagram connection request doesn't match your current session. Start over from Personal Brand.")
  }

  // Re-checked independently of the state payload itself — role/
  // membership could have changed in the (short) window between
  // starting the flow and Meta redirecting back.
  if (!canWriteWorkspace(scope, consumed.payload.workspaceId)) {
    return redirectWithError(request, 'You no longer have permission to connect Instagram for that Social Workspace.')
  }

  const code = searchParams.get('code')
  if (!code) {
    return redirectWithError(request, 'Instagram did not return an authorization code. Please try connecting again.')
  }

  const redirectUri = new URL(CALLBACK_PATH, siteOrigin(request)).toString()

  const shortLived = await exchangeCodeForUserToken({ code, redirectUri })
  if (!shortLived.ok) {
    return redirectWithError(request, `Instagram authorization failed: ${shortLived.error}`)
  }

  const longLived = await exchangeForLongLivedUserToken(shortLived.data.accessToken)
  if (!longLived.ok) {
    return redirectWithError(request, `Instagram authorization failed: ${longLived.error}`)
  }

  const pagesResult = await fetchPagesWithInstagramAccounts(longLived.data.accessToken)
  if (!pagesResult.ok) {
    return redirectWithError(request, `Failed to look up your Instagram account: ${pagesResult.error}`)
  }

  const selected = selectInstagramAccount(pagesResult.data)
  if (!selected.ok) {
    return redirectWithError(request, selected.error)
  }

  const upsertResult = await upsertConnectedInstagramAccount(consumed.payload.workspaceId, consumed.payload.adminUserId, {
    instagramAccountId: selected.page.instagramAccountId,
    username: selected.page.username,
    displayName: selected.page.name,
    pageAccessToken: selected.page.pageAccessToken,
    tokenExpiresAt: longLived.data.expiresAt,
  })

  if (!upsertResult.ok) {
    return redirectWithError(request, upsertResult.error)
  }

  return redirectWithSuccess(request, upsertResult.reauthorized ? 'reconnected' : upsertResult.replacedPreviousAccount ? 'replaced' : 'connected')
}
