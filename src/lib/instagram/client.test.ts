import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/src/lib/supabase/server', () => ({
  supabaseServer: {
    from: vi.fn(() => {
      const chain: Record<string, unknown> = {}
      chain.select = vi.fn(() => chain)
      chain.eq = vi.fn(() => chain)
      chain.maybeSingle = vi.fn(async () => ({ data: null, error: null })) // no token stored for any account, by default
      return chain
    }),
  },
}))

import { fetchMediaInsights, sendDirectMessage, sendPrivateReplyToComment, subscribeInstagramAccountToWebhooks } from './client'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('fetchMediaInsights', () => {
  it('requests views as an INSIGHTS metric (not a base media field) alongside reach/saved/shares', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({ data: [{ name: 'reach', values: [{ value: 10 }] }, { name: 'saved', values: [{ value: 2 }] }, { name: 'shares', values: [{ value: 1 }] }, { name: 'views', values: [{ value: 99 }] }] })
    )

    const result = await fetchMediaInsights({ mediaId: 'media-1', accessToken: 'token', provider: 'facebook_login' })

    const [requestUrl] = vi.mocked(fetch).mock.calls[0]
    const url = new URL(String(requestUrl))
    expect(url.searchParams.get('metric')).toContain('views')
    expect(result).toEqual({ reach: 10, saved: 2, shares: 1, views: 99 })
  })

  it('falls back to one metric at a time when the combined request fails, salvaging whichever metrics Meta DOES accept', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ error: { message: 'Invalid metric', code: 100 } }, 400)) // combined request fails
      .mockResolvedValueOnce(jsonResponse({ data: [{ name: 'reach', values: [{ value: 5 }] }] })) // reach alone succeeds
      .mockResolvedValueOnce(jsonResponse({ error: { message: 'saved not supported for this media' } }, 400)) // saved alone fails
      .mockResolvedValueOnce(jsonResponse({ data: [{ name: 'shares', values: [{ value: 3 }] }] })) // shares alone succeeds
      .mockResolvedValueOnce(jsonResponse({ data: [{ name: 'views', values: [{ value: 7 }] }] })) // views alone succeeds

    const result = await fetchMediaInsights({ mediaId: 'media-2', accessToken: 'token', provider: 'facebook_login', mediaType: 'VIDEO' })

    expect(result).toEqual({ reach: 5, saved: null, shares: 3, views: 7 })
  })

  it('returns all-null (never throws) when every fallback attempt also fails, and logs instagram_insights_fetch_failure with safe metadata only', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ error: { message: 'Unsupported' } }, 400))

    const result = await fetchMediaInsights({ mediaId: 'media-3', accessToken: 'secret-token-value', provider: 'facebook_login', mediaType: 'IMAGE' })

    expect(result).toEqual({ reach: null, saved: null, shares: null, views: null })
    const loggedText = vi.mocked(console.error).mock.calls.map((call) => call.join(' ')).join(' ')
    expect(loggedText).toContain('instagram_insights_fetch_failure')
    expect(loggedText).toContain('media-3')
    expect(loggedText).not.toContain('secret-token-value')
  })

  it('never throws on a network exception', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network down'))

    await expect(fetchMediaInsights({ mediaId: 'media-4', accessToken: 'token', provider: 'facebook_login' })).resolves.toEqual({
      reach: null,
      saved: null,
      shares: null,
      views: null,
    })
  })
})

describe('sendDirectMessage / sendPrivateReplyToComment — per-account token routing', () => {
  it('fails cleanly with no connected-account token stored, never falling back to a global/env token', async () => {
    // supabaseServer is mocked to an empty object above — any real query
    // against it will throw, which getMessagingTokenForAccount must
    // swallow into `null`, not propagate.
    const result = await sendDirectMessage('account-with-no-token', 'igsid-1', 'hello')
    expect(result.ok).toBe(false)
  })

  it('sendPrivateReplyToComment also requires a connectedAccountId and fails the same safe way without one', async () => {
    const result = await sendPrivateReplyToComment('account-with-no-token', 'comment-1', 'hello')
    expect(result.ok).toBe(false)
  })
})

describe('subscribeInstagramAccountToWebhooks', () => {
  it('POSTs to graph.instagram.com/me/subscribed_apps with both comments and messages in subscribed_fields', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ success: true }))

    const result = await subscribeInstagramAccountToWebhooks('ig-login-token')

    const [requestUrl, requestInit] = vi.mocked(fetch).mock.calls[0]
    const url = new URL(String(requestUrl))
    expect(url.host).toBe('graph.instagram.com')
    expect(url.pathname).toContain('/me/subscribed_apps')
    expect(url.searchParams.get('subscribed_fields')).toBe('comments,messages')
    expect((requestInit as RequestInit)?.method).toBe('POST')
    expect(result).toEqual({ ok: true, data: { success: true } })
  })

  it('fails cleanly (never throws) when Meta rejects the subscription, without leaking the access token', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ error: { message: 'Invalid OAuth access token', code: 190 } }, 400))

    const result = await subscribeInstagramAccountToWebhooks('secret-ig-login-token')

    expect(result.ok).toBe(false)
    const loggedText = vi.mocked(console.error).mock.calls.map((call) => call.join(' ')).join(' ')
    expect(loggedText).not.toContain('secret-ig-login-token')
  })
})
