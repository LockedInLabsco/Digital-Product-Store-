import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/src/lib/supabase/server', () => ({ supabaseServer: {} }))

import {
  buildInstagramDmAuthorizationUrl,
  isInstagramDmConnectConfigured,
  exchangeCodeForInstagramDmToken,
  exchangeForLongLivedInstagramDmToken,
  INSTAGRAM_DM_OAUTH_SCOPES,
} from './instagramDmOAuth'
import { GRAPH_API_VERSION } from './client'

const ORIGINAL_ENV = { ...process.env }

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

beforeEach(() => {
  // Deliberately ALSO set the OTHER two apps' own credentials to
  // different values — the regression guard that this module reads ONLY
  // its own INSTAGRAM_DM_* pair, never falling back to either the
  // legacy Facebook app or the existing Direct Instagram Login app.
  process.env.INSTAGRAM_APP_ID = 'facebook-app-id-wrong'
  process.env.INSTAGRAM_APP_SECRET = 'facebook-app-secret-wrong'
  process.env.INSTAGRAM_LOGIN_APP_ID = 'instagram-login-app-id-wrong'
  process.env.INSTAGRAM_LOGIN_APP_SECRET = 'instagram-login-app-secret-wrong'
  process.env.INSTAGRAM_DM_APP_ID = 'instagram-dm-app-id-correct'
  process.env.INSTAGRAM_DM_APP_SECRET = 'instagram-dm-app-secret-correct'
  vi.stubGlobal('fetch', vi.fn())
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('isInstagramDmConnectConfigured', () => {
  it('is true only when both INSTAGRAM_DM_APP_ID and INSTAGRAM_DM_APP_SECRET are set', () => {
    expect(isInstagramDmConnectConfigured()).toBe(true)
    delete process.env.INSTAGRAM_DM_APP_ID
    expect(isInstagramDmConnectConfigured()).toBe(false)
  })

  it('is false when only the OTHER two apps’ credentials are set — no silent fallback', () => {
    delete process.env.INSTAGRAM_DM_APP_ID
    delete process.env.INSTAGRAM_DM_APP_SECRET
    // INSTAGRAM_APP_ID/SECRET and INSTAGRAM_LOGIN_APP_ID/SECRET are still set from beforeEach.
    expect(isInstagramDmConnectConfigured()).toBe(false)
  })
})

describe('buildInstagramDmAuthorizationUrl', () => {
  it('builds the Instagram Business Login authorize URL using the N4N DM Automations app’s own client id, never the other two apps’', () => {
    const url = new URL(buildInstagramDmAuthorizationUrl({ redirectUri: 'https://site.example/connect-dm/callback', state: 'nonce-abc' }))

    expect(url.hostname).toBe('www.instagram.com')
    expect(url.pathname).toMatch(/\/oauth\/authorize$/)
    expect(url.searchParams.get('client_id')).toBe('instagram-dm-app-id-correct')
    expect(url.searchParams.get('client_id')).not.toBe('facebook-app-id-wrong')
    expect(url.searchParams.get('client_id')).not.toBe('instagram-login-app-id-wrong')
    expect(url.searchParams.get('redirect_uri')).toBe('https://site.example/connect-dm/callback')
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('state')).toBe('nonce-abc')
    expect(url.searchParams.get('scope')).toBe(INSTAGRAM_DM_OAUTH_SCOPES.join(','))
  })

  it('throws a clear, specific error instead of silently using another app’s id when INSTAGRAM_DM_APP_ID is missing', () => {
    delete process.env.INSTAGRAM_DM_APP_ID

    expect(() => buildInstagramDmAuthorizationUrl({ redirectUri: 'https://site.example/callback', state: 'nonce-abc' })).toThrow(/INSTAGRAM_DM_APP_ID/)
  })
})

describe('exchangeForLongLivedInstagramDmToken', () => {
  it('uses GET against the explicit, versioned graph.instagram.com path', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ access_token: 'long-lived-token', expires_in: 5184000 }))

    await exchangeForLongLivedInstagramDmToken('short-lived-token')

    const [requestUrl, init] = vi.mocked(fetch).mock.calls[0]
    const url = new URL(String(requestUrl))
    expect(init?.method).toBe('GET')
    expect(url.hostname).toBe('graph.instagram.com')
    expect(url.pathname).toBe(`/${GRAPH_API_VERSION}/access_token`)
  })

  it('uses INSTAGRAM_DM_APP_SECRET, never INSTAGRAM_APP_SECRET or INSTAGRAM_LOGIN_APP_SECRET', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ access_token: 'long-lived-token', expires_in: 5184000 }))

    await exchangeForLongLivedInstagramDmToken('short-lived-token')

    const [requestUrl] = vi.mocked(fetch).mock.calls[0]
    const url = new URL(String(requestUrl))
    expect(url.searchParams.get('client_secret')).toBe('instagram-dm-app-secret-correct')
    expect(url.searchParams.get('client_secret')).not.toBe('facebook-app-secret-wrong')
    expect(url.searchParams.get('client_secret')).not.toBe('instagram-login-app-secret-wrong')
  })

  it('fails closed (ok: false) on a Meta-side error, and never logs the client_secret or either token', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: { message: 'Unsupported request', type: 'IGApiException', code: 100 } }, 400))

    const result = await exchangeForLongLivedInstagramDmToken('secret-short-lived-token-value')

    expect(result.ok).toBe(false)
    const loggedText = vi.mocked(console.error).mock.calls.map((call) => call.join(' ')).join(' ')
    expect(loggedText).not.toContain('secret-short-lived-token-value')
    expect(loggedText).not.toContain('instagram-dm-app-secret-correct')
  })

  it('never throws out of a network failure', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('network down'))
    const result = await exchangeForLongLivedInstagramDmToken('secret-token-value')
    expect(result.ok).toBe(false)
  })
})

describe('exchangeCodeForInstagramDmToken', () => {
  it('POSTs form data to api.instagram.com/oauth/access_token using the N4N DM Automations app’s own credentials', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ access_token: 'short-lived-token' }))

    await exchangeCodeForInstagramDmToken({ code: 'auth-code-abc', redirectUri: 'https://site.example/connect-dm/callback' })

    const [requestUrl, init] = vi.mocked(fetch).mock.calls[0]
    expect(String(requestUrl)).toBe('https://api.instagram.com/oauth/access_token')
    expect(init?.method).toBe('POST')
    expect(init?.body).toBeInstanceOf(FormData)
    const form = init?.body as FormData
    expect(form.get('client_id')).toBe('instagram-dm-app-id-correct')
    expect(form.get('client_secret')).toBe('instagram-dm-app-secret-correct')
    expect(form.get('grant_type')).toBe('authorization_code')
    expect(form.get('code')).toBe('auth-code-abc')
  })
})
