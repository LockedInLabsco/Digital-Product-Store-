/**
 * Meta OAuth handshake for the N4N DM Automations app — a SEPARATE Meta
 * Developer App dedicated to Instagram messaging/automation only
 * (comments + messages webhooks, outbound DM sends), deliberately kept
 * apart from the existing Direct Instagram Login app so the two can be
 * validated, debugged, and (eventually) deprecated independently — see
 * the repository audit's §22/§23 recommendation for why this is a new
 * app/provider/webhook route rather than widening the existing ones.
 *
 * This file is an intentional near-duplicate of
 * src/lib/instagram/instagramLoginOAuth.ts: same product family
 * ("Instagram API with Instagram Login" / "Business Login for
 * Instagram"), same OAuth lifecycle (authorize → short-lived code
 * exchange → long-lived token exchange → profile lookup), same
 * identifier pitfall (never trust the token-exchange response's
 * app-scoped `user_id` as the account id — only the follow-up
 * GET graph.instagram.com/me?fields=user_id,... call resolves the real,
 * stable Instagram professional account id). The ONLY difference is
 * which credential pair is read: INSTAGRAM_DM_APP_ID / INSTAGRAM_DM_APP_SECRET,
 * never INSTAGRAM_LOGIN_APP_ID/SECRET or INSTAGRAM_APP_ID/SECRET — a
 * missing INSTAGRAM_DM_APP_ID must fail loudly here, never silently fall
 * back to either of the other two Meta Apps' credentials (that fallback
 * is exactly the class of bug instagramLoginOAuth.ts's own header
 * documents a real production incident for).
 *
 * Do NOT merge this with instagramLoginOAuth.ts just because the logic
 * looks identical — see this project's own convention (client.ts's file
 * header, instagramLoginOAuth.ts's file header) of keeping distinct Meta
 * App credential pairs in distinct files/constants so a future
 * modification to one app's flow can never accidentally bleed into
 * another's.
 */
import 'server-only'
import { GRAPH_API_VERSION } from './client'

const AUTHORIZE_BASE = 'https://www.instagram.com'
const SHORT_LIVED_TOKEN_URL = 'https://api.instagram.com/oauth/access_token'
const GRAPH_BASE = `https://graph.instagram.com/${GRAPH_API_VERSION}`
const REQUEST_TIMEOUT_MS = 15000

/**
 * Same current (post-January-2025) Instagram Login scope names as
 * instagramLoginOAuth.ts — see that file's own comment for why
 * instagram_business_content_publish is deliberately excluded.
 */
export const INSTAGRAM_DM_OAUTH_SCOPES = ['instagram_business_basic', 'instagram_business_manage_messages', 'instagram_business_manage_comments']

export function isInstagramDmConnectConfigured(): boolean {
  return Boolean(process.env.INSTAGRAM_DM_APP_ID && process.env.INSTAGRAM_DM_APP_SECRET)
}

/**
 * The Instagram app ID from the N4N DM Automations Meta App's own
 * Dashboard → Instagram → API setup with Instagram Login → Business
 * login settings — NOT INSTAGRAM_APP_ID (legacy Facebook Login app) and
 * NOT INSTAGRAM_LOGIN_APP_ID (the existing Direct Instagram Login app).
 * No fallback to either on purpose — a missing INSTAGRAM_DM_APP_ID must
 * fail loudly here.
 */
function requireAppId(): string {
  const appId = process.env.INSTAGRAM_DM_APP_ID
  if (!appId) throw new Error('INSTAGRAM_DM_APP_ID is not configured (this is the Instagram app ID from the N4N DM Automations Meta App Dashboard → Instagram → API setup with Instagram Login, not INSTAGRAM_APP_ID or INSTAGRAM_LOGIN_APP_ID)')
  return appId
}

/** The Instagram app secret from the SAME N4N DM Automations Dashboard section as requireAppId() above. No fallback to INSTAGRAM_APP_SECRET or INSTAGRAM_LOGIN_APP_SECRET. */
function requireAppSecret(): string {
  const secret = process.env.INSTAGRAM_DM_APP_SECRET
  if (!secret) throw new Error('INSTAGRAM_DM_APP_SECRET is not configured (this is the Instagram app secret from the N4N DM Automations Meta App Dashboard → Instagram → API setup with Instagram Login, not INSTAGRAM_APP_SECRET or INSTAGRAM_LOGIN_APP_SECRET)')
  return secret
}

/** `https://www.instagram.com/oauth/authorize?...` — redirectUri must exactly match a URI registered on the N4N DM Automations app's own "Instagram Business Login" redirect URI list in the Meta Dashboard (a separate list from both the Facebook Login product's and the existing Direct Instagram Login app's). */
export function buildInstagramDmAuthorizationUrl({ redirectUri, state }: { redirectUri: string; state: string }): string {
  const url = new URL(`${AUTHORIZE_BASE}/oauth/authorize`)
  url.searchParams.set('client_id', requireAppId())
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', INSTAGRAM_DM_OAUTH_SCOPES.join(','))
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

/** Same contract as instagramLoginOAuth.ts's callMeta — only Meta's own public error metadata is ever logged, never a token/code/secret. */
async function callMeta<T>(label: string, run: (signal: AbortSignal) => Promise<Response>): Promise<OAuthHttpResult<T>> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await run(controller.signal)
    const json = await response.json().catch(() => null)
    const metaError: MetaErrorObject | undefined = json?.error

    if (!response.ok || !json) {
      const message = metaError?.message || `Meta API request failed (status ${response.status})`
      console.error('[Instagram DM Connect]', label, 'Meta API error', response.status, message, metaError?.type, metaError?.code, metaError?.fbtrace_id)
      return { ok: false, error: message }
    }

    return { ok: true, data: json as T }
  } catch (error) {
    const isAbort = error instanceof Error && error.name === 'AbortError'
    console.error('[Instagram DM Connect]', label, 'Exception calling Meta API', isAbort ? 'timed out' : error)
    return { ok: false, error: isAbort ? 'Meta API request timed out' : 'Meta API request failed' }
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Step 1 — exchanges the authorization `code` for a short-lived token.
 * Deliberately does NOT return the response's own `user_id` — see this
 * file's header comment for why that value must never be trusted as the
 * account id.
 */
export async function exchangeCodeForInstagramDmToken({
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

/**
 * Step 2 — `ig_exchange_token`, converting the short-lived token into a
 * long-lived one (~60 days). GET with an explicit, versioned
 * graph.instagram.com path — same fix instagramLoginOAuth.ts's own
 * equivalent function already applies, never the bare unversioned host.
 * client_secret is ALWAYS requireAppSecret() — INSTAGRAM_DM_APP_SECRET,
 * never INSTAGRAM_APP_SECRET or INSTAGRAM_LOGIN_APP_SECRET.
 */
export async function exchangeForLongLivedInstagramDmToken(shortLivedToken: string): Promise<OAuthHttpResult<{ accessToken: string; expiresAt: string | null }>> {
  const url = new URL(`${GRAPH_BASE}/access_token`)
  url.searchParams.set('grant_type', 'ig_exchange_token')
  url.searchParams.set('client_secret', requireAppSecret())
  url.searchParams.set('access_token', shortLivedToken)

  const result = await callMeta<{ access_token: string; expires_in?: number }>('long_lived_exchange', (signal) => fetch(url.toString(), { method: 'GET', signal }))

  if (!result.ok) return result
  const expiresAt = typeof result.data.expires_in === 'number' ? new Date(Date.now() + result.data.expires_in * 1000).toISOString() : null
  return { ok: true, data: { accessToken: result.data.access_token, expiresAt } }
}

export interface InstagramDmProfile {
  /** The Instagram professional account's own stable id — THIS is what
   * becomes social_connected_accounts.external_account_id (via the
   * reauthorize-merge path in upsertConnectedInstagramAccount, if an
   * instagram_login/facebook_login connection for the same account
   * already exists) and the webhook_entry_id identifier, never the
   * token-exchange response's user_id. */
  instagramAccountId: string
  username: string | null
  name: string | null
  /** Meta's documented values are "Business" or "Media_Creator" — recorded for display/diagnostics, not used as a gate (same defense-in-depth convention as the Direct Login callback). */
  accountType: string | null
}

/** Step 3 — the one authoritative "who did we just connect" call, identical in shape to instagramLoginOAuth.ts's fetchInstagramLoginProfile. */
export async function fetchInstagramDmProfile(accessToken: string): Promise<OAuthHttpResult<InstagramDmProfile>> {
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
