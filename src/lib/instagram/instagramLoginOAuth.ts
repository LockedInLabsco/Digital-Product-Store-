/**
 * Meta OAuth handshake for DIRECT Instagram Login — "Instagram API with
 * Instagram Login" / "Business Login for Instagram" (Meta's current
 * naming, verified against developers.facebook.com/docs/instagram-platform
 * in October 2026 — NOT copied from an older tutorial). This is the
 * preferred "Connect Instagram" path going forward: the user authorizes
 * at instagram.com with their own Instagram credentials, authorizing
 * their Instagram professional (Business or Creator) account directly —
 * no Facebook Page, Page link, or Facebook login screen involved.
 *
 * Deliberately parallel to, and NOT a replacement for,
 * src/lib/instagram/facebookOAuth.ts (Facebook Login for Business,
 * graph.facebook.com) — that flow keeps working unchanged for every
 * already-connected account (e.g. @alx.lifelogs) and for any workspace
 * that specifically needs a Facebook-Login-only feature later. The two
 * are intentionally kept on separate hosts/scopes/files, same reasoning
 * as client.ts's own file header for why content and messaging must
 * never be merged just because the names sound similar.
 *
 * Same Meta App (INSTAGRAM_APP_ID/INSTAGRAM_APP_SECRET) as the existing
 * Facebook Login flow and the existing messaging-token refresh in
 * tokenStore.ts — one Meta app can carry both the "Instagram Business
 * Login" and "Facebook Login for Business" products at once, so no new
 * app or env vars are required, only a new redirect URI registered on
 * the SAME app (see the Meta Dashboard setup section of the Phase G
 * report).
 *
 * CRITICAL identifier pitfall (verified against Meta's own docs and
 * confirmed by multiple independent developer write-ups — do not
 * "simplify" this away): the short-lived token exchange response
 * (api.instagram.com/oauth/access_token) returns its OWN `user_id`
 * field, which is an APP-SCOPED id, not the stable Instagram
 * professional account id. The only reliable source for the real
 * account id — the same one Meta sends back as the recipient/entry id
 * on Instagram-Login-routed webhooks — is a follow-up
 * GET graph.instagram.com/me?fields=user_id,username call made WITH the
 * resulting access token (see fetchInstagramLoginProfile below). Never
 * use the token-exchange response's user_id as external_account_id.
 */
import 'server-only'
import { GRAPH_API_VERSION } from './client'

const AUTHORIZE_BASE = 'https://www.instagram.com'
const SHORT_LIVED_TOKEN_URL = 'https://api.instagram.com/oauth/access_token'
const GRAPH_BASE = `https://graph.instagram.com/${GRAPH_API_VERSION}`
// Deliberately unversioned, matching src/lib/instagram/tokenStore.ts's
// already-working callExchangeEndpoint — Meta's own documented example
// for ig_exchange_token calls this host directly with no version
// segment, and tokenStore.ts proves that works in production today.
const UNVERSIONED_GRAPH_BASE = 'https://graph.instagram.com'
const REQUEST_TIMEOUT_MS = 15000

/**
 * The current (post-January-2025) Instagram Login scope names — Meta
 * retired the old short names (business_basic, business_manage_comments,
 * etc.) in favor of these `instagram_business_*` values. Deliberately
 * excludes `instagram_business_content_publish`: this app never
 * publishes TO Instagram, only reads content/insights and sends/receives
 * messages, so that scope would only add an unused, App-Review-gated
 * permission to the consent screen.
 */
export const INSTAGRAM_LOGIN_OAUTH_SCOPES = ['instagram_business_basic', 'instagram_business_manage_messages', 'instagram_business_manage_comments']

export function isInstagramLoginConnectConfigured(): boolean {
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

/** `https://www.instagram.com/oauth/authorize?...` — the consent screen users are redirected to. redirectUri must exactly match a URI registered on the Instagram product's own "Instagram Business Login" redirect URI list in the Meta Dashboard (a SEPARATE list from the Facebook Login product's). */
export function buildInstagramLoginAuthorizationUrl({ redirectUri, state }: { redirectUri: string; state: string }): string {
  const url = new URL(`${AUTHORIZE_BASE}/oauth/authorize`)
  url.searchParams.set('client_id', requireAppId())
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', INSTAGRAM_LOGIN_OAUTH_SCOPES.join(','))
  url.searchParams.set('state', state)
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
 * One request, start to finish: times out, parses Meta's response (only
 * Meta's own public error metadata — message/type/code/fbtrace_id — is
 * ever logged, never a token/code/secret), and reports both a network
 * failure and a Meta-side error through the same OAuthHttpResult shape
 * so every caller below has exactly one failure branch to check.
 */
async function callMeta<T>(label: string, run: (signal: AbortSignal) => Promise<Response>): Promise<OAuthHttpResult<T>> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await run(controller.signal)
    const json = await response.json().catch(() => null)
    const metaError: MetaErrorObject | undefined = json?.error

    if (!response.ok || !json) {
      const message = metaError?.message || `Meta API request failed (status ${response.status})`
      console.error('[Instagram Login Connect]', label, 'Meta API error', response.status, message, metaError?.type, metaError?.code, metaError?.fbtrace_id)
      return { ok: false, error: message }
    }

    return { ok: true, data: json as T }
  } catch (error) {
    const isAbort = error instanceof Error && error.name === 'AbortError'
    console.error('[Instagram Login Connect]', label, 'Exception calling Meta API', isAbort ? 'timed out' : error)
    return { ok: false, error: isAbort ? 'Meta API request timed out' : 'Meta API request failed' }
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Step 1 — exchanges the authorization `code` for a short-lived token.
 * POSTs as multipart form data, matching Meta's own documented curl
 * example for this exact endpoint exactly (api.instagram.com has shown
 * inconsistent behavior with other content-types for this call in past
 * developer reports — not worth deviating from the documented example).
 * Deliberately does NOT return the response's own `user_id` — see this
 * file's header comment for why that value must never be trusted as the
 * account id.
 */
export async function exchangeCodeForInstagramLoginToken({
  code,
  redirectUri,
}: {
  code: string
  redirectUri: string
}): Promise<OAuthHttpResult<{ accessToken: string }>> {
  const form = new FormData()
  form.set('client_id', requireAppId())
  form.set('client_secret', requireAppSecret())
  form.set('grant_type', 'authorization_code')
  form.set('redirect_uri', redirectUri)
  form.set('code', code)

  const result = await callMeta<{ access_token: string; user_id?: number | string }>('short_lived_exchange', (signal) =>
    fetch(SHORT_LIVED_TOKEN_URL, { method: 'POST', body: form, signal })
  )

  if (!result.ok) return result
  return { ok: true, data: { accessToken: result.data.access_token } }
}

/** Step 2 — `ig_exchange_token`, converting the short-lived token into a long-lived one (~60 days). Identical mechanics to tokenStore.ts's callExchangeEndpoint, duplicated rather than imported: that file owns the separate messaging-token singleton's lifecycle and is deliberately not a dependency of the content-connect path (see this file's header). */
export async function exchangeForLongLivedInstagramLoginToken(shortLivedToken: string): Promise<OAuthHttpResult<{ accessToken: string; expiresAt: string | null }>> {
  const url = new URL(`${UNVERSIONED_GRAPH_BASE}/access_token`)
  url.searchParams.set('grant_type', 'ig_exchange_token')
  url.searchParams.set('client_secret', requireAppSecret())
  url.searchParams.set('access_token', shortLivedToken)

  const result = await callMeta<{ access_token: string; expires_in?: number }>('long_lived_exchange', (signal) => fetch(url.toString(), { signal }))

  if (!result.ok) return result
  const expiresAt = typeof result.data.expires_in === 'number' ? new Date(Date.now() + result.data.expires_in * 1000).toISOString() : null
  return { ok: true, data: { accessToken: result.data.access_token, expiresAt } }
}

export interface InstagramLoginProfile {
  /** The Instagram professional account's own stable id — THIS is what
   * becomes social_connected_accounts.external_account_id and the
   * webhook_entry_id identifier (see instagramConnectAccount.ts), never
   * the token-exchange response's user_id. */
  instagramAccountId: string
  username: string | null
  name: string | null
  /** Meta's documented values are "Business" or "Media_Creator" — a
   * personal account cannot reach this call at all (Instagram Login's
   * own consent screen only ever lets the user pick a professional
   * account), so this is recorded for display/diagnostics, not used as
   * a gate. */
  accountType: string | null
}

/** Step 3 — the one authoritative "who did we just connect" call. */
export async function fetchInstagramLoginProfile(accessToken: string): Promise<OAuthHttpResult<InstagramLoginProfile>> {
  const url = new URL(`${GRAPH_BASE}/me`)
  url.searchParams.set('fields', 'user_id,username,name,account_type')
  url.searchParams.set('access_token', accessToken)

  const result = await callMeta<{ user_id: string; username?: string; name?: string; account_type?: string }>('profile_fetch', (signal) =>
    fetch(url.toString(), { signal })
  )

  if (!result.ok) return result

  return {
    ok: true,
    data: {
      instagramAccountId: String(result.data.user_id),
      username: result.data.username ?? null,
      name: result.data.name ?? null,
      accountType: result.data.account_type ?? null,
    },
  }
}
