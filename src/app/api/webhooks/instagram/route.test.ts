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

import { POST } from './route'

const INSTAGRAM_LOGIN_SECRET = 'instagram-login-secret'
const FACEBOOK_LOGIN_SECRET = 'facebook-login-secret'

function sign(body: string, secret: string): string {
  return `sha256=${createHmac('sha256', secret).update(body, 'utf8').digest('hex')}`
}

function makeRequest(body: string, signature: string | null) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (signature) headers['x-hub-signature-256'] = signature
  return new NextRequest('http://localhost/api/webhooks/instagram', { method: 'POST', headers, body })
}

describe('POST /api/webhooks/instagram — signature verification', () => {
  const originalLoginSecret = process.env.INSTAGRAM_LOGIN_APP_SECRET
  const originalAppSecret = process.env.INSTAGRAM_APP_SECRET

  beforeEach(() => {
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

  it('rejects with 401 when the signature matches neither configured app secret', async () => {
    const body = JSON.stringify({ entry: [] })
    const response = await POST(makeRequest(body, sign(body, 'some-random-secret')))
    expect(response.status).toBe(401)
    expect(mocks.processTrigger).not.toHaveBeenCalled()
  })

  it('rejects with 401 when the raw body was mutated after signing', async () => {
    const signedBody = JSON.stringify({ entry: [{ id: '1' }] })
    const mutatedBody = JSON.stringify({ entry: [{ id: '2' }] })
    const response = await POST(makeRequest(mutatedBody, sign(signedBody, INSTAGRAM_LOGIN_SECRET)))
    expect(response.status).toBe(401)
  })

  it('accepts a comment event signed with the Direct Instagram Login secret and lets it reach processTrigger', async () => {
    const body = JSON.stringify({
      entry: [{ id: 'entry-1', changes: [{ field: 'comments', value: { id: 'comment-1', text: 'slowday', from: { id: 'user-1' } } }] }],
    })

    const response = await POST(makeRequest(body, sign(body, INSTAGRAM_LOGIN_SECRET)))

    expect(response.status).toBe(200)
    expect(mocks.processTrigger).toHaveBeenCalledWith(
      expect.objectContaining({ triggerType: 'comment_keyword', sourceId: 'comment-1', connectedAccountId: 'account-1' })
    )
  })

  it('accepts a legacy webhook signed with the Facebook Login app secret and lets a comment event reach processTrigger', async () => {
    const body = JSON.stringify({
      entry: [{ id: 'entry-1', changes: [{ field: 'comments', value: { id: 'comment-2', text: 'slowday', from: { id: 'user-2' } } }] }],
    })

    const response = await POST(makeRequest(body, sign(body, FACEBOOK_LOGIN_SECRET)))

    expect(response.status).toBe(200)
    expect(mocks.processTrigger).toHaveBeenCalledWith(expect.objectContaining({ sourceId: 'comment-2' }))
  })

  it('accepts a DM event signed with the Direct Instagram Login secret and lets it reach processTrigger', async () => {
    const body = JSON.stringify({
      entry: [{ id: 'entry-1', messaging: [{ sender: { id: 'sender-1' }, message: { mid: 'mid-1', text: 'slowday' } }] }],
    })

    const response = await POST(makeRequest(body, sign(body, INSTAGRAM_LOGIN_SECRET)))

    expect(response.status).toBe(200)
    expect(mocks.processTrigger).toHaveBeenCalledWith(
      expect.objectContaining({ triggerType: 'dm_keyword', sourceId: 'mid-1', connectedAccountId: 'account-1' })
    )
  })

  it('never logs either configured app secret, on either a valid or an invalid request', async () => {
    const logSpy = vi.spyOn(console, 'log')
    const errorSpy = vi.spyOn(console, 'error')

    const goodBody = JSON.stringify({ entry: [{ id: 'entry-1', changes: [{ field: 'comments', value: { id: 'c', from: { id: 'u' } } }] }] })
    await POST(makeRequest(goodBody, sign(goodBody, INSTAGRAM_LOGIN_SECRET)))
    await POST(makeRequest('{}', sign('{}', 'wrong-secret')))

    const loggedText = [...logSpy.mock.calls, ...errorSpy.mock.calls].flat().map((v) => (typeof v === 'string' ? v : JSON.stringify(v))).join(' ')
    expect(loggedText).not.toContain(INSTAGRAM_LOGIN_SECRET)
    expect(loggedText).not.toContain(FACEBOOK_LOGIN_SECRET)
  })
})
