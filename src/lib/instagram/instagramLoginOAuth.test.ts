import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
// Same reasoning as facebookOAuth.test.ts — avoid the real supabaseServer
// client construction this file's GRAPH_API_VERSION import transitively
// pulls in.
vi.mock('@/src/lib/supabase/server', () => ({ supabaseServer: {} }))

import { buildInstagramLoginAuthorizationUrl, isInstagramLoginConnectConfigured, INSTAGRAM_LOGIN_OAUTH_SCOPES } from './instagramLoginOAuth'

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  // Deliberately ALSO set the Facebook app's own credentials to
  // different values — this is the regression guard for the actual
  // production bug ("Invalid platform app"): this module must read its
  // OWN Instagram Login credentials, never fall through to these.
  process.env.INSTAGRAM_APP_ID = 'facebook-app-id-wrong'
  process.env.INSTAGRAM_APP_SECRET = 'facebook-app-secret-wrong'
  process.env.INSTAGRAM_LOGIN_APP_ID = 'instagram-login-app-id-correct'
  process.env.INSTAGRAM_LOGIN_APP_SECRET = 'instagram-login-app-secret-correct'
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
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
