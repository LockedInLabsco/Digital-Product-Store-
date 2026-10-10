import { createHmac } from 'crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  resolveConnectedAccountFromWebhookEntryId: vi.fn(),
  processTrigger: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/src/lib/instagram/accountResolution', () => ({
  resolveConnectedAccountFromWebhookEntryId: mocks.resolveConnectedAccountFromWebhookEntryId,
}))
vi.mock('@/src/lib/instagram/processTrigger', () => ({
  processTrigger: mocks.processTrigger,
}))

import { GET, POST } from './route'

const DM_APP_SECRET = 'dm-app-secret'
const INSTAGRAM_LOGIN_SECRET = 'instagram-login-secret'
const FACEBOOK_LOGIN_SECRET = 'facebook-login-secret'

function sign(body: string, secret: string): string {
  return `sha256=${createHmac('sha256', secret).update(body, 'utf8').digest('hex')}`
}

function makeRequest(body: string, signature: string | null) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (signature) headers['x-hub-signature-256'] = signature
  return new NextRequest('http://localhost/api/webhooks/instagram/dm', { method: 'POST', headers, body })
}

describe('POST /api/webhooks/instagram/dm — signature verification is isolated to INSTAGRAM_DM_APP_SECRET only', () => {
  const originalDmSecret = process.env.INSTAGRAM_DM_APP_SECRET
  const originalLoginSecret = process.env.INSTAGRAM_LOGIN_APP_SECRET
  const originalAppSecret = process.env.INSTAGRAM_APP_SECRET

  beforeEach(() => {
    process.env.INSTAGRAM_DM_APP_SECRET = DM_APP_SECRET
    // Deliberately ALSO set the OTHER two apps' secrets — the regression
    // guard that this route never accepts either of them, unlike the
    // existing /api/webhooks/instagram route which accepts both.
    process.env.INSTAGRAM_LOGIN_APP_SECRET = INSTAGRAM_LOGIN_SECRET
    process.env.INSTAGRAM_APP_SECRET = FACEBOOK_LOGIN_SECRET
    mocks.resolveConnectedAccountFromWebhookEntryId.mockReset().mockResolvedValue({
      connectedAccountId: 'account-1',
      workspaceId: 'workspace-1',
    })
    mocks.processTrigger.mockReset().mockResolvedValue(undefined)
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    process.env.INSTAGRAM_DM_APP_SECRET = originalDmSecret
    process.env.INSTAGRAM_LOGIN_APP_SECRET = originalLoginSecret
    process.env.INSTAGRAM_APP_SECRET = originalAppSecret
    vi.restoreAllMocks()
  })

  it('rejects with 401 when there is no signature header at all', async () => {
    const body = JSON.stringify({ entry: [] })
    const response = await POST(makeRequest(body, null))
    expect(response.status).toBe(401)
    expect(mocks.processTrigger).not.toHaveBeenCalled()
  })

  it('rejects with 401 when signed with the EXISTING Direct Instagram Login app secret — proves isolation from the legacy/old app', async () => {
    const body = JSON.stringify({ entry: [{ id: 'entry-1', changes: [{ field: 'comments', value: { id: 'c', from: { id: 'u' } } }] }] })
    const response = await POST(makeRequest(body, sign(body, INSTAGRAM_LOGIN_SECRET)))
    expect(response.status).toBe(401)
    expect(mocks.processTrigger).not.toHaveBeenCalled()
  })

  it('rejects with 401 when signed with the legacy Facebook Login app secret', async () => {
    const body = JSON.stringify({ entry: [{ id: 'entry-1', changes: [{ field: 'comments', value: { id: 'c', from: { id: 'u' } } }] }] })
    const response = await POST(makeRequest(body, sign(body, FACEBOOK_LOGIN_SECRET)))
    expect(response.status).toBe(401)
    expect(mocks.processTrigger).not.toHaveBeenCalled()
  })

  it('rejects with 401 when the raw body was mutated after signing (raw-body verification, not a re-serialized round-trip)', async () => {
    const signedBody = JSON.stringify({ entry: [{ id: '1' }] })
    const mutatedBody = JSON.stringify({ entry: [{ id: '2' }] })
    const response = await POST(makeRequest(mutatedBody, sign(signedBody, DM_APP_SECRET)))
    expect(response.status).toBe(401)
  })

  it('accepts a comment event signed with INSTAGRAM_DM_APP_SECRET and routes it to the shared processTrigger with provider "instagram_dm"', async () => {
    const body = JSON.stringify({
      entry: [{ id: 'entry-1', changes: [{ field: 'comments', value: { id: 'comment-1', text: 'hello', from: { id: 'user-1' } } }] }],
    })

    const response = await POST(makeRequest(body, sign(body, DM_APP_SECRET)))

    expect(response.status).toBe(200)
    expect(mocks.processTrigger).toHaveBeenCalledWith(
      expect.objectContaining({ triggerType: 'comment_keyword', sourceId: 'comment-1', connectedAccountId: 'account-1', provider: 'instagram_dm' })
    )
  })

  it('accepts a DM event signed with INSTAGRAM_DM_APP_SECRET and routes it with provider "instagram_dm"', async () => {
    const body = JSON.stringify({
      entry: [{ id: 'entry-1', messaging: [{ sender: { id: 'sender-1' }, message: { mid: 'mid-1', text: 'hello' } }] }],
    })

    const response = await POST(makeRequest(body, sign(body, DM_APP_SECRET)))

    expect(response.status).toBe(200)
    expect(mocks.processTrigger).toHaveBeenCalledWith(
      expect.objectContaining({ triggerType: 'dm_keyword', sourceId: 'mid-1', connectedAccountId: 'account-1', provider: 'instagram_dm' })
    )
  })

  it('filters out an is_echo message the same way the existing route does', async () => {
    const body = JSON.stringify({
      entry: [{ id: 'entry-1', messaging: [{ sender: { id: 'sender-1' }, message: { mid: 'mid-1', text: 'hello', is_echo: true } }] }],
    })

    const response = await POST(makeRequest(body, sign(body, DM_APP_SECRET)))

    expect(response.status).toBe(200)
    expect(mocks.processTrigger).not.toHaveBeenCalled()
  })

  it('never logs INSTAGRAM_DM_APP_SECRET or either of the other two apps’ secrets', async () => {
    const logSpy = vi.spyOn(console, 'log')
    const errorSpy = vi.spyOn(console, 'error')

    const goodBody = JSON.stringify({ entry: [{ id: 'entry-1', changes: [{ field: 'comments', value: { id: 'c', from: { id: 'u' } } }] }] })
    await POST(makeRequest(goodBody, sign(goodBody, DM_APP_SECRET)))
    await POST(makeRequest('{}', sign('{}', 'wrong-secret')))

    const loggedText = [...logSpy.mock.calls, ...errorSpy.mock.calls].flat().map((v) => (typeof v === 'string' ? v : JSON.stringify(v))).join(' ')
    expect(loggedText).not.toContain(DM_APP_SECRET)
    expect(loggedText).not.toContain(INSTAGRAM_LOGIN_SECRET)
    expect(loggedText).not.toContain(FACEBOOK_LOGIN_SECRET)
  })
})

function makeVerifyRequest(params: Record<string, string>) {
  const url = new URL('http://localhost/api/webhooks/instagram/dm')
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  return new NextRequest(url)
}

describe('GET /api/webhooks/instagram/dm — verification uses ONLY INSTAGRAM_DM_WEBHOOK_VERIFY_TOKEN', () => {
  const DM_VERIFY_TOKEN = 'dm-verify-token'
  const originalDmVerifyToken = process.env.INSTAGRAM_DM_WEBHOOK_VERIFY_TOKEN
  const originalLegacyVerifyToken = process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN

  beforeEach(() => {
    process.env.INSTAGRAM_DM_WEBHOOK_VERIFY_TOKEN = DM_VERIFY_TOKEN
    // Deliberately a DIFFERENT value than the DM token — proves this
    // route never falls back to the existing shared verify token.
    process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN = 'legacy-verify-token'
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    process.env.INSTAGRAM_DM_WEBHOOK_VERIFY_TOKEN = originalDmVerifyToken
    process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN = originalLegacyVerifyToken
    vi.restoreAllMocks()
  })

  it('returns the challenge with 200 when mode/token/challenge are all correct for the DM verify token', async () => {
    const response = await GET(makeVerifyRequest({ 'hub.mode': 'subscribe', 'hub.verify_token': DM_VERIFY_TOKEN, 'hub.challenge': 'challenge-abc' }))
    expect(response.status).toBe(200)
    expect(await response.text()).toBe('challenge-abc')
  })

  it('rejects with 403 when presented with the EXISTING legacy verify token instead of the DM one', async () => {
    const response = await GET(makeVerifyRequest({ 'hub.mode': 'subscribe', 'hub.verify_token': 'legacy-verify-token', 'hub.challenge': 'challenge-abc' }))
    expect(response.status).toBe(403)
  })

  it('rejects with 403 when the token does not match, without ever logging either token value', async () => {
    const logSpy = vi.spyOn(console, 'log')
    const response = await GET(makeVerifyRequest({ 'hub.mode': 'subscribe', 'hub.verify_token': 'wrong-token', 'hub.challenge': 'challenge-abc' }))
    expect(response.status).toBe(403)

    const loggedText = logSpy.mock.calls.flat().map((v) => (typeof v === 'string' ? v : JSON.stringify(v))).join(' ')
    expect(loggedText).not.toContain(DM_VERIFY_TOKEN)
    expect(loggedText).not.toContain('wrong-token')
  })
})
