/**
 * Meta OAuth handshake for the "Connect Instagram" flow — Facebook Login
 * (classic scope-based dialog, not the "Facebook Login for Business"
 * config_id product, which requires Business Verification/App Review
 * this project doesn't have — see the implementation report). This is
 * the CONTENT/INSIGHTS side only: the resulting Page Access Token is
 * what src/lib/instagram/client.ts's graph.facebook.com calls use,
 * stored as a social_account_tokens row with provider='facebook_login',
 * same as contentAccountResolution.ts already expects.
 *
 * Deliberately NOT the Instagram API with Instagram Login product (the
 * messaging side, graph.instagram.com) — that's a separate OAuth
 * surface entirely (authorization at instagram.com, not facebook.com,
 * different scopes, different token host) and out of scope here; see
 * client.ts's own file header for why the two must never be merged.
 *
 * One Meta app backs both products (same App ID/App Secret as the
 * existing INSTAGRAM_APP_SECRET used for messaging-token refresh in
 * tokenStore.ts) — only a new INSTAGRAM_APP_ID is required for this file,
 * since nothing before this needed to *start* an OAuth redirect.
 */
import 'server-only'
import { GRAPH_API_VERSION } from './client'
import { logConnectStage } from './connectDiagnostics'

const AUTHORIZE_BASE = 'https://www.facebook.com'
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`
const REQUEST_TIMEOUT_MS = 15000

/**
 * Read-only content/insights scopes — matches docs/INSTAGRAM_SYNC_SETUP.md's
 * manually-generated token instructions exactly, now requested via a real
 * OAuth dialog instead of pasted from Graph API Explorer. Never includes
 * any instagram_business_* (messaging) scope.
 *
 * business_management added after diagnosing a real production failure:
 * for a Facebook Page managed through a Meta Business Portfolio/Business
 * Manager (as opposed to a Page the person manages directly), GET
 * /me/accounts returns an empty `data: []` without it — confirmed
 * against Meta's own Developer Community
 * (developers.facebook.com/community/threads/335402512246332/, where
 * multiple developers independently reproduced and fixed this exact
 * symptom by adding this permission) and against
 * developers.facebook.com/docs/permissions/'s own business_management
 * entry. There is no separate/alternate Page-discovery endpoint to call
 * instead — the official Graph API `User` node reference
 * (developers.facebook.com/docs/graph-api/reference/user/) lists only
 * one Page-related edge, `accounts` ("Pages the User has a role on"),
 * which is exactly /me/accounts, already in use below. No
 * `/me/assigned_pages` or equivalent exists in the current reference —
 * deliberately not invented here.
 */
export const CONTENT_OAUTH_SCOPES = ['instagram_basic', 'instagram_manage_insights', 'pages_show_list', 'pages_read_engagement', 'business_management']

export function isInstagramConnectConfigured(): boolean {
  return Boolean(process.env.INSTAGRAM_APP_ID && process.env.INSTAGRAM_APP_SECRET)
}

function requireAppId(): string {
  const appId = process.env.INSTAGRAM_APP_ID
  if (!appId) throw new Error('INSTAGRAM_APP_ID is not configured')
  return appId
}

function requireAppSecret(): string {
  const secret = process.env.INSTAGRAM_APP_SECRET
  if (!secret) throw new Error('INSTAGRAM_APP_SECRET is not configured')
  return secret
}

/**
 * auth_type=rerequest — the current, officially documented Facebook
 * Login parameter (Meta's "Manually Build a Login Flow" docs) for
 * forcing the consent dialog to re-ask for a permission the user
 * previously DECLINED, rather than silently reusing whatever was
 * granted on an earlier authorization. Verified directly against
 * Meta's own docs before adding — not guessed. Safe to leave on
 * permanently: it has no effect when every requested scope is either
 * already granted or being asked for the first time, so it only
 * changes behavior in exactly the case we need visibility into (a
 * previously-declined permission silently staying declined).
 */
export function buildFacebookAuthorizationUrl({ redirectUri, state }: { redirectUri: string; state: string }): string {
  const url = new URL(`${AUTHORIZE_BASE}/${GRAPH_API_VERSION}/dialog/oauth`)
  url.searchParams.set('client_id', requireAppId())
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('state', state)
  url.searchParams.set('scope', CONTENT_OAUTH_SCOPES.join(','))
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('auth_type', 'rerequest')
  return url.toString()
}

type OAuthHttpResult<T> = { ok: true; data: T } | { ok: false; error: string }

interface MetaErrorObject {
  message?: string
  type?: string
  code?: number
  error_subcode?: number
  fbtrace_id?: string
}

/**
 * `label` identifies which call this is for in the diagnostic log only
 * — never part of the request itself. Logs the literal HTTP status and,
 * on failure, Meta's own safe error object (message/type/code/
 * error_subcode/fbtrace_id — all public diagnostic metadata Meta
 * returns in the response body itself, never anything derived from the
 * access token/app secret/code used to make the call).
 */
async function graphGetJson<T>(url: string, label: string): Promise<OAuthHttpResult<T>> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(url, { signal: controller.signal })
    const json = await response.json().catch(() => null)
    const metaError: MetaErrorObject | undefined = json?.error

    if (!response.ok || !json) {
      const message = metaError?.message || `Meta API request failed (status ${response.status})`
      console.error('[Instagram Connect] Meta API error', response.status, message)
      logConnectStage('graph_api_call', {
        label,
        httpStatus: response.status,
        ok: false,
        metaError: metaError ? { message: metaError.message, type: metaError.type, code: metaError.code, errorSubcode: metaError.error_subcode, fbtraceId: metaError.fbtrace_id } : null,
      })
      return { ok: false, error: message }
    }

    logConnectStage('graph_api_call', { label, httpStatus: response.status, ok: true })
    return { ok: true, data: json as T }
  } catch (error) {
    const isAbort = error instanceof Error && error.name === 'AbortError'
    console.error('[Instagram Connect] Exception calling Meta API', isAbort ? 'timed out' : error)
    logConnectStage('graph_api_call', { label, ok: false, exception: isAbort ? 'timed_out' : 'fetch_failed' })
    return { ok: false, error: isAbort ? 'Meta API request timed out' : 'Meta API request failed' }
  } finally {
    clearTimeout(timeout)
  }
}

/** Step 1 of the token exchange — the authorization `code` Meta just redirected back with, for a short-lived user access token. redirectUri must be byte-identical to the one used to build the authorization URL. */
export async function exchangeCodeForUserToken({ code, redirectUri }: { code: string; redirectUri: string }): Promise<OAuthHttpResult<{ accessToken: string }>> {
  const url = new URL(`${GRAPH_BASE}/oauth/access_token`)
  url.searchParams.set('client_id', requireAppId())
  url.searchParams.set('client_secret', requireAppSecret())
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('code', code)

  const result = await graphGetJson<{ access_token: string }>(url.toString(), 'code_exchange')
  if (!result.ok) return result
  return { ok: true, data: { accessToken: result.data.access_token } }
}

/** Step 2 — `fb_exchange_token`, converting the short-lived token into a long-lived one (~60 days). */
export async function exchangeForLongLivedUserToken(shortLivedToken: string): Promise<OAuthHttpResult<{ accessToken: string; expiresAt: string | null }>> {
  const url = new URL(`${GRAPH_BASE}/oauth/access_token`)
  url.searchParams.set('grant_type', 'fb_exchange_token')
  url.searchParams.set('client_id', requireAppId())
  url.searchParams.set('client_secret', requireAppSecret())
  url.searchParams.set('fb_exchange_token', shortLivedToken)

  const result = await graphGetJson<{ access_token: string; expires_in?: number }>(url.toString(), 'long_lived_exchange')
  if (!result.ok) return result
  const expiresAt = typeof result.data.expires_in === 'number' ? new Date(Date.now() + result.data.expires_in * 1000).toISOString() : null
  logConnectStage('long_lived_exchange', { ok: true, hasExpiry: expiresAt !== null })
  return { ok: true, data: { accessToken: result.data.access_token, expiresAt } }
}

export interface GrantedPermission {
  permission: string
  status: 'granted' | 'declined' | string
}

/** Every scope this flow actually requests (CONTENT_OAUTH_SCOPES) — explicitly called out in every granted-permissions log line so a declined one is impossible to miss. business_management is the one most likely to be silently declined for a Business-Manager-assigned Page — see CONTENT_OAUTH_SCOPES's own comment. */
const TRACKED_SCOPES = ['pages_show_list', 'pages_read_engagement', 'instagram_basic', 'instagram_manage_insights', 'business_management'] as const

/**
 * `GET /me/permissions` — the official Graph API endpoint for checking
 * which of the requested permissions a user token ACTUALLY has granted
 * vs declined. Critical because Meta's own docs are explicit that a
 * person can decline individual permissions while accepting others, and
 * the login callback itself never reports that — only this endpoint
 * does. Read-only, primarily diagnostic: selectInstagramAccount()'s own
 * decision logic (which Page/account to connect) never consults this —
 * the one place the callback DOES use the result is to pick a clearer
 * error message when zero Pages come back (see getPermissionStatus),
 * which changes WHAT THE ADMIN IS TOLD, never which account gets
 * selected or saved.
 */
export async function fetchGrantedPermissions(userAccessToken: string): Promise<OAuthHttpResult<GrantedPermission[]>> {
  const url = new URL(`${GRAPH_BASE}/me/permissions`)
  url.searchParams.set('access_token', userAccessToken)

  const result = await graphGetJson<{ data: GrantedPermission[] }>(url.toString(), 'me_permissions')
  if (!result.ok) {
    logConnectStage('granted_permissions_check', { ok: false })
    return result
  }

  const permissions = result.data.data || []
  const byName = new Map(permissions.map((p) => [p.permission, p.status]))

  logConnectStage('granted_permissions_check', {
    ok: true,
    trackedScopes: Object.fromEntries(TRACKED_SCOPES.map((scope) => [scope, byName.get(scope) ?? 'not_present'])),
    allPermissions: permissions,
  })

  return { ok: true, data: permissions }
}

/** Looks up one scope's granted/declined status from an already-fetched fetchGrantedPermissions() result — 'not_present' if Meta didn't return it at all (distinct from 'declined'). */
export function getPermissionStatus(permissions: GrantedPermission[], scope: string): string {
  return permissions.find((p) => p.permission === scope)?.status ?? 'not_present'
}

export interface FacebookPageWithInstagram {
  pageId: string
  pageName: string | null
  /** The Page Access Token — this, not the user token, is what gets
   * stored as the facebook_login content/insights token; Meta's own
   * docs for the Instagram Graph API call this out as the token content
   * calls should use. */
  pageAccessToken: string
  instagramAccountId: string
  username: string | null
  name: string | null
}

interface RawPage {
  id: string
  name?: string
  access_token: string
  instagram_business_account?: { id: string; username?: string; name?: string }
}

export interface FetchPagesResult {
  pages: FacebookPageWithInstagram[]
  /** Total Pages returned by /me/accounts, BEFORE filtering to only
   * those with a linked Instagram account — lets the caller tell "the
   * authorizing user manages zero Pages at all" (no_pages) apart from
   * "they manage Pages, but none has a linked Instagram account"
   * (no_instagram_account), which otherwise collapse to the same empty
   * `pages` array. Purely additive diagnostic info — selectInstagramAccount()'s
   * own decision logic is unchanged and still only ever sees `pages`. */
  totalPageCount: number
}

/** Step 3 — every Page the authorizing user manages, with its linked Instagram Business/Creator account (if any) expanded in the same call. Pages with no linked Instagram account are filtered out of `pages` here, not left for the caller to re-check. */
export async function fetchPagesWithInstagramAccounts(userAccessToken: string): Promise<OAuthHttpResult<FetchPagesResult>> {
  const url = new URL(`${GRAPH_BASE}/me/accounts`)
  url.searchParams.set('fields', 'id,name,access_token,instagram_business_account{id,username,name}')
  url.searchParams.set('access_token', userAccessToken)

  const result = await graphGetJson<{ data: RawPage[] }>(url.toString(), 'me_accounts')
  if (!result.ok) return result

  const rawPages = result.data.data || []

  // Safe-only: Page id/name and Instagram account id/username are
  // display-level identifiers the admin already sees in Meta's own UI,
  // never a token/secret. Logged per-page so a production investigation
  // can see exactly which of the authorizing user's Pages did or didn't
  // have a linked Instagram account, without needing DB/token access.
  logConnectStage('me_accounts_fetch', {
    ok: true,
    totalPageCount: rawPages.length,
    pages: rawPages.map((page) => ({
      pageId: page.id,
      pageName: page.name ?? null,
      hasInstagramAccount: Boolean(page.instagram_business_account?.id),
      instagramAccountId: page.instagram_business_account?.id ?? null,
      username: page.instagram_business_account?.username ?? null,
    })),
  })

  const pages: FacebookPageWithInstagram[] = rawPages
    .filter((page): page is RawPage & { instagram_business_account: { id: string; username?: string; name?: string } } =>
      Boolean(page.instagram_business_account?.id)
    )
    .map((page) => ({
      pageId: page.id,
      pageName: page.name ?? null,
      pageAccessToken: page.access_token,
      instagramAccountId: page.instagram_business_account.id,
      username: page.instagram_business_account.username ?? null,
      name: page.instagram_business_account.name ?? null,
    }))

  return { ok: true, data: { pages, totalPageCount: rawPages.length } }
}

export type SelectInstagramAccountResult = { ok: true; page: FacebookPageWithInstagram } | { ok: false; reason: 'none' | 'ambiguous'; error: string }

/**
 * Picks the one Instagram professional account to connect — fails closed
 * (never "pick the first") if the authorizing Facebook user manages zero
 * or more than one Page with a linked Instagram Business/Creator
 * account. Pure function, no I/O — the multi-account case is a real,
 * known limitation (see the implementation report), not built here since
 * a workspace can only hold one active connected Instagram account
 * today regardless.
 */
export function selectInstagramAccount(pages: FacebookPageWithInstagram[]): SelectInstagramAccountResult {
  if (pages.length === 0) {
    logConnectStage('select_instagram_account', { ok: false, reason: 'none', eligiblePageCount: 0 })
    return {
      ok: false,
      reason: 'none',
      error:
        'No Instagram professional account is linked to any Facebook Page you manage. Link your Instagram Business or Creator account to a Facebook Page, then try again.',
    }
  }
  if (pages.length > 1) {
    logConnectStage('select_instagram_account', { ok: false, reason: 'ambiguous', eligiblePageCount: pages.length })
    return {
      ok: false,
      reason: 'ambiguous',
      error:
        "More than one Facebook Page with a linked Instagram account was found. Connecting a specific account out of several isn't supported yet — authorize with a Facebook login that manages only one such Page.",
    }
  }
  logConnectStage('select_instagram_account', { ok: true, instagramAccountId: pages[0].instagramAccountId, username: pages[0].username })
  return { ok: true, page: pages[0] }
}
