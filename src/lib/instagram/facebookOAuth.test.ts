import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
// facebookOAuth.ts imports GRAPH_API_VERSION from client.ts, which
// transitively imports tokenStore.ts -> supabase/server.ts; mocked here
// purely to avoid that chain constructing a real Supabase client with no
// env vars configured in the test environment (createClient('', '')
// throws). Nothing in this test actually touches supabaseServer.
vi.mock('@/src/lib/supabase/server', () => ({ supabaseServer: {} }))

import {
  buildFacebookAuthorizationUrl,
  getPermissionStatus,
  isInstagramConnectConfigured,
  selectInstagramAccount,
  CONTENT_OAUTH_SCOPES,
  type FacebookPageWithInstagram,
} from './facebookOAuth'

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  process.env.INSTAGRAM_APP_ID = 'app-id-123'
  process.env.INSTAGRAM_APP_SECRET = 'app-secret-xyz'
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

describe('isInstagramConnectConfigured', () => {
  it('is true only when both INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET are set', () => {
    expect(isInstagramConnectConfigured()).toBe(true)
    delete process.env.INSTAGRAM_APP_ID
    expect(isInstagramConnectConfigured()).toBe(false)
  })
})

describe('buildFacebookAuthorizationUrl', () => {
  it('builds the classic Facebook Login OAuth dialog URL with the required params and read-only content scopes', () => {
    const url = new URL(buildFacebookAuthorizationUrl({ redirectUri: 'https://site.example/callback', state: 'nonce-abc' }))

    expect(url.hostname).toBe('www.facebook.com')
    expect(url.pathname).toMatch(/\/dialog\/oauth$/)
    expect(url.searchParams.get('client_id')).toBe('app-id-123')
    expect(url.searchParams.get('redirect_uri')).toBe('https://site.example/callback')
    expect(url.searchParams.get('state')).toBe('nonce-abc')
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('scope')).toBe(CONTENT_OAUTH_SCOPES.join(','))
  })

  it('always sets auth_type=rerequest so a previously-declined scope is re-asked instead of silently staying declined', () => {
    const url = new URL(buildFacebookAuthorizationUrl({ redirectUri: 'https://site.example/callback', state: 'nonce-abc' }))
    expect(url.searchParams.get('auth_type')).toBe('rerequest')
  })

  it('never requests any instagram_business_* (messaging) scope — content/insights only', () => {
    expect(CONTENT_OAUTH_SCOPES.some((scope) => scope.startsWith('instagram_business_'))).toBe(false)
  })

  it('requests business_management — required for a Facebook Page managed through a Business Portfolio to appear via /me/accounts', () => {
    expect(CONTENT_OAUTH_SCOPES).toContain('business_management')
  })

  it('throws rather than silently building an unusable URL when INSTAGRAM_APP_ID is missing', () => {
    delete process.env.INSTAGRAM_APP_ID
    expect(() => buildFacebookAuthorizationUrl({ redirectUri: 'https://site.example/callback', state: 'nonce-abc' })).toThrow(/INSTAGRAM_APP_ID/)
  })
})

describe('getPermissionStatus', () => {
  it('CASE 3: reports a declined scope’s exact status', () => {
    expect(getPermissionStatus([{ permission: 'business_management', status: 'declined' }], 'business_management')).toBe('declined')
  })

  it('reports a granted scope’s exact status', () => {
    expect(getPermissionStatus([{ permission: 'pages_show_list', status: 'granted' }], 'pages_show_list')).toBe('granted')
  })

  it('reports "not_present" rather than "declined" for a scope Meta never returned at all', () => {
    expect(getPermissionStatus([{ permission: 'pages_show_list', status: 'granted' }], 'business_management')).toBe('not_present')
  })
})

function page(overrides: Partial<FacebookPageWithInstagram> = {}): FacebookPageWithInstagram {
  return {
    pageId: 'page-1',
    pageName: 'Page One',
    pageAccessToken: 'page-token',
    instagramAccountId: 'ig-1',
    username: 'brand_one',
    name: 'Brand One',
    ...overrides,
  }
}

describe('selectInstagramAccount', () => {
  it('CASE 1/2: selects the one Instagram account when exactly one linked Page is found', () => {
    const result = selectInstagramAccount([page()])
    expect(result).toEqual({ ok: true, page: page() })
  })

  it('CASE 5: fails closed (never picks first) when more than one linked Page is found', () => {
    const result = selectInstagramAccount([page({ instagramAccountId: 'ig-1' }), page({ instagramAccountId: 'ig-2', pageId: 'page-2' })])
    expect(result).toEqual({ ok: false, reason: 'ambiguous', error: expect.any(String) })
  })

  it('fails closed with a clear error when no Page has a linked Instagram account', () => {
    const result = selectInstagramAccount([])
    expect(result).toEqual({ ok: false, reason: 'none', error: expect.any(String) })
  })
})
