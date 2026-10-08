import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
// Same reasoning as facebookOAuth.test.ts — avoid the real supabaseServer
// client construction this file's GRAPH_API_VERSION import transitively
// pulls in.
vi.mock('@/src/lib/supabase/server', () => ({ supabaseServer: {} }))

import {
  buildInstagramLoginAuthorizationUrl,
  isInstagramLoginConnectConfigured,
  exchangeCodeForInstagramLoginToken,
  exchangeForLongLivedInstagramLoginToken,
  INSTAGRAM_LOGIN_OAUTH_SCOPES,
} from './instagramLoginOAuth'
import { GRAPH_API_VERSION } from './client'

const ORIGINAL_ENV = { ...process.env }

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

beforeEach(() => {
  // Deliberately ALSO set the Facebook app's own credentials to
  // different values — this is the regression guard for the actual
  // production bug ("Invalid platform app"): this module must read its
  // OWN Instagram Login credentials, never fall through to these.
  process.env.INSTAGRAM_APP_ID = 'facebook-app-id-wrong'
  process.env.INSTAGRAM_APP_SECRET = 'facebook-app-secret-wrong'
  process.env.INSTAGRAM_LOGIN_APP_ID = 'instagram-login-app-id-correct'
  process.env.INSTAGRAM_LOGIN_APP_SECRET = 'instagram-login-app-secret-correct'
  vi.stubGlobal('fetch', vi.fn())
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('isInstagramLoginConnectConfigured', () => {
  it('is true only when both INSTAGRAM_LOGIN_APP_ID and INSTAGRAM_LOGIN_APP_SECRET are set', () => {
    expect(isInstagramLoginConnectConfigured()).toBe(true)
    delete process.env.INSTAGRAM_LOGIN_APP_ID
    expect(isInstagramLoginConnectConfigured()).toBe(false)
  })

  it('is false when only the Facebook App’s own credentials are set — no silent fallback', () => {
    delete process.env.INSTAGRAM_LOGIN_APP_ID
    delete process.env.INSTAGRAM_LOGIN_APP_SECRET
    // INSTAGRAM_APP_ID/INSTAGRAM_APP_SECRET are still set from beforeEach.
    expect(isInstagramLoginConnectConfigured()).toBe(false)
  })
})

describe('buildInstagramLoginAuthorizationUrl', () => {
  it('builds the Instagram Business Login authorize URL using the Instagram-specific client id, never the Facebook App id', () => {
    const url = new URL(buildInstagramLoginAuthorizationUrl({ redirectUri: 'https://site.example/connect-direct/callback', state: 'nonce-abc' }))

    expect(url.hostname).toBe('www.instagram.com')
    expect(url.pathname).toMatch(/\/oauth\/authorize$/)
    expect(url.searchParams.get('client_id')).toBe('instagram-login-app-id-correct')
    expect(url.searchParams.get('client_id')).not.toBe('facebook-app-id-wrong')
    expect(url.searchParams.get('redirect_uri')).toBe('https://site.example/connect-direct/callback')
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('state')).toBe('nonce-abc')
    expect(url.searchParams.get('scope')).toBe(INSTAGRAM_LOGIN_OAUTH_SCOPES.join(','))
  })

  it('throws a clear, specific error instead of silently using the Facebook App id when INSTAGRAM_LOGIN_APP_ID is missing', () => {
    delete process.env.INSTAGRAM_LOGIN_APP_ID

    expect(() => buildInstagramLoginAuthorizationUrl({ redirectUri: 'https://site.example/callback', state: 'nonce-abc' })).toThrow(
      /INSTAGRAM_LOGIN_APP_ID/
    )
  })

  it('never requests instagram_business_content_publish — this app never publishes to Instagram', () => {
    expect(INSTAGRAM_LOGIN_OAUTH_SCOPES).not.toContain('instagram_business_content_publish')
  })
})

describe('exchangeForLongLivedInstagramLoginToken — production fix regression guard', () => {
  it('uses GET, not POST — Meta’s current reference docs list POST as unsupported for this endpoint', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ access_token: 'long-lived-token', expires_in: 5184000 }))

    await exchangeForLongLivedInstagramLoginToken('short-lived-token')

    const [, init] = vi.mocked(fetch).mock.calls[0]
    expect(init?.method).toBe('GET')
  })

  it('calls the explicit, versioned graph.instagram.com path — the actual bug fixed here, never the bare unversioned host', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ access_token: 'long-lived-token', expires_in: 5184000 }))

    await exchangeForLongLivedInstagramLoginToken('short-lived-token')

    const [requestUrl] = vi.mocked(fetch).mock.calls[0]
    const url = new URL(String(requestUrl))
    expect(url.hostname).toBe('graph.instagram.com')
    expect(url.pathname).toBe(`/${GRAPH_API_VERSION}/access_token`)
  })

  it('places grant_type, client_secret, and access_token in the query string — not a form body — matching Meta’s documented GET shape', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ access_token: 'long-lived-token', expires_in: 5184000 }))

    await exchangeForLongLivedInstagramLoginToken('short-lived-token-xyz')

    const [requestUrl, init] = vi.mocked(fetch).mock.calls[0]
    const url = new URL(String(requestUrl))
    expect(url.searchParams.get('grant_type')).toBe('ig_exchange_token')
    expect(url.searchParams.get('client_secret')).toBe('instagram-login-app-secret-correct')
    expect(url.searchParams.get('access_token')).toBe('short-lived-token-xyz')
    expect(init?.body).toBeUndefined()
  })

  it('uses INSTAGRAM_LOGIN_APP_SECRET, never INSTAGRAM_APP_SECRET', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ access_token: 'long-lived-token', expires_in: 5184000 }))

    await exchangeForLongLivedInstagramLoginToken('short-lived-token')

    const [requestUrl] = vi.mocked(fetch).mock.calls[0]
    const url = new URL(String(requestUrl))
    expect(url.searchParams.get('client_secret')).not.toBe('facebook-app-secret-wrong')
  })

  it('fails closed (ok: false) on a Meta-side error, and logs only safe fields — never the client_secret or either token', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ error: { message: 'Unsupported request - method type: get', type: 'IGApiException', code: 100, fbtrace_id: 'trace-123' } }, 400)
    )

    const result = await exchangeForLongLivedInstagramLoginToken('secret-short-lived-token-value')

    expect(result.ok).toBe(false)

    const loggedText = vi.mocked(console.error).mock.calls.map((call) => call.join(' ')).join(' ')
    expect(loggedText).not.toContain('secret-short-lived-token-value')
    expect(loggedText).not.toContain('instagram-login-app-secret-correct')
    expect(loggedText).toContain('Unsupported request - method type: get')
    expect(loggedText).toContain('IGApiException')
  })

  it('never throws out of a network failure, and never logs the access token being exchanged', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('network down'))

    const result = await exchangeForLongLivedInstagramLoginToken('secret-token-value')

    expect(result.ok).toBe(false)
    const loggedText = vi.mocked(console.error).mock.calls.map((call) => call.join(' ')).join(' ')
    expect(loggedText).not.toContain('secret-token-value')
  })
})

describe('exchangeCodeForInstagramLoginToken — unchanged by this fix', () => {
  it('still POSTs form data to api.instagram.com/oauth/access_token, untouched by the long-lived-exchange fix', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ access_token: 'short-lived-token' }))

    await exchangeCodeForInstagramLoginToken({ code: 'auth-code-abc', redirectUri: 'https://site.example/connect-direct/callback' })

    const [requestUrl, init] = vi.mocked(fetch).mock.calls[0]
    expect(String(requestUrl)).toBe('https://api.instagram.com/oauth/access_token')
    expect(init?.method).toBe('POST')
    expect(init?.body).toBeInstanceOf(FormData)
    const form = init?.body as FormData
    expect(form.get('client_id')).toBe('instagram-login-app-id-correct')
    expect(form.get('client_secret')).toBe('instagram-login-app-secret-correct')
    expect(form.get('grant_type')).toBe('authorization_code')
    expect(form.get('code')).toBe('auth-code-abc')
  })
})
