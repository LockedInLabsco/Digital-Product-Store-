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

const AUTHORIZE_BASE = 'https://www.facebook.com'
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`
const REQUEST_TIMEOUT_MS = 15000

/**
 * Read-only content/insights scopes — matches docs/INSTAGRAM_SYNC_SETUP.md's
 * manually-generated token instructions exactly, now requested via a real
 * OAuth dialog instead of pasted from Graph API Explorer. Never includes
 * any instagram_business_* (messaging) scope.
 */
export const CONTENT_OAUTH_SCOPES = ['instagram_basic', 'instagram_manage_insights', 'pages_show_list', 'pages_read_engagement']

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

export function buildFacebookAuthorizationUrl({ redirectUri, state }: { redirectUri: string; state: string }): string {
  const url = new URL(`${AUTHORIZE_BASE}/${GRAPH_API_VERSION}/dialog/oauth`)
  url.searchParams.set('client_id', requireAppId())
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('state', state)
  url.searchParams.set('scope', CONTENT_OAUTH_SCOPES.join(','))
  url.searchParams.set('response_type', 'code')
  return url.toString()
}

type OAuthHttpResult<T> = { ok: true; data: T } | { ok: false; error: string }

async function graphGetJson<T>(url: string): Promise<OAuthHttpResult<T>> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(url, { signal: controller.signal })
    const json = await response.json().catch(() => null)
    if (!response.ok || !json) {
      const message = json?.error?.message || `Meta API request failed (status ${response.status})`
      console.error('[Instagram Connect] Meta API error', response.status, message)
      return { ok: false, error: message }
    }
    return { ok: true, data: json as T }
  } catch (error) {
    const isAbort = error instanceof Error && error.name === 'AbortError'
    console.error('[Instagram Connect] Exception calling Meta API', isAbort ? 'timed out' : error)
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

  const result = await graphGetJson<{ access_token: string }>(url.toString())
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

  const result = await graphGetJson<{ access_token: string; expires_in?: number }>(url.toString())
  if (!result.ok) return result
  const expiresAt = typeof result.data.expires_in === 'number' ? new Date(Date.now() + result.data.expires_in * 1000).toISOString() : null
  return { ok: true, data: { accessToken: result.data.access_token, expiresAt } }
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

/** Step 3 — every Page the authorizing user manages, with its linked Instagram Business/Creator account (if any) expanded in the same call. Pages with no linked Instagram account are filtered out here, not left for the caller to re-check. */
export async function fetchPagesWithInstagramAccounts(userAccessToken: string): Promise<OAuthHttpResult<FacebookPageWithInstagram[]>> {
  const url = new URL(`${GRAPH_BASE}/me/accounts`)
  url.searchParams.set('fields', 'id,name,access_token,instagram_business_account{id,username,name}')
  url.searchParams.set('access_token', userAccessToken)

  const result = await graphGetJson<{ data: RawPage[] }>(url.toString())
  if (!result.ok) return result

  const pages: FacebookPageWithInstagram[] = (result.data.data || [])
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

  return { ok: true, data: pages }
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
    return {
      ok: false,
      reason: 'none',
      error:
        'No Instagram professional account is linked to any Facebook Page you manage. Link your Instagram Business or Creator account to a Facebook Page, then try again.',
    }
  }
  if (pages.length > 1) {
    return {
      ok: false,
      reason: 'ambiguous',
      error:
        "More than one Facebook Page with a linked Instagram account was found. Connecting a specific account out of several isn't supported yet — authorize with a Facebook login that manages only one such Page.",
    }
  }
  return { ok: true, page: pages[0] }
}
