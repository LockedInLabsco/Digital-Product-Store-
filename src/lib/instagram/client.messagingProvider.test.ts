import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  getMessagingTokenForAccount: vi.fn(),
}))

vi.mock('./tokenStore', () => ({
  getMessagingTokenForAccount: mocks.getMessagingTokenForAccount,
}))

import { sendDirectMessage, sendPrivateReplyToComment, replyToComment } from './client'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
}

beforeEach(() => {
  mocks.getMessagingTokenForAccount.mockReset().mockResolvedValue({ token: 'ig-token', rowId: 'row-1' })
  vi.stubGlobal('fetch', vi.fn())
  vi.mocked(fetch).mockResolvedValue(jsonResponse({ id: 'sent-1' }))
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('client.ts send functions — provider threading to getMessagingTokenForAccount (N4N DM Automations)', () => {
  it('sendDirectMessage defaults to provider "instagram_login" when omitted — every pre-existing caller unchanged', async () => {
    await sendDirectMessage('account-1', 'igsid-1', 'hello')
    expect(mocks.getMessagingTokenForAccount).toHaveBeenCalledWith('account-1', 'instagram_login')
  })

  it('sendDirectMessage passes "instagram_dm" through explicitly when given, never substituting instagram_login', async () => {
    await sendDirectMessage('account-1', 'igsid-1', 'hello', null, 'instagram_dm')
    expect(mocks.getMessagingTokenForAccount).toHaveBeenCalledWith('account-1', 'instagram_dm')
  })

  it('sendPrivateReplyToComment threads the explicit provider through the same way', async () => {
    await sendPrivateReplyToComment('account-1', 'comment-1', 'hello', null, 'instagram_dm')
    expect(mocks.getMessagingTokenForAccount).toHaveBeenCalledWith('account-1', 'instagram_dm')
  })

  it('replyToComment threads the explicit provider through the same way', async () => {
    await replyToComment('account-1', 'comment-1', 'hello', 'instagram_dm')
    expect(mocks.getMessagingTokenForAccount).toHaveBeenCalledWith('account-1', 'instagram_dm')
  })

  it('fails cleanly, never falling back to instagram_login, when the requested provider has no stored token', async () => {
    mocks.getMessagingTokenForAccount.mockResolvedValue(null)
    const result = await sendDirectMessage('account-1', 'igsid-1', 'hello', null, 'instagram_dm')
    expect(result.ok).toBe(false)
    expect(mocks.getMessagingTokenForAccount).toHaveBeenCalledWith('account-1', 'instagram_dm')
    expect(fetch).not.toHaveBeenCalled()
  })
})
