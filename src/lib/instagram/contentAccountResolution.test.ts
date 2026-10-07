import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  accountRow: null as { id: string; external_account_id: string } | null,
  accountError: null as { message: string; code?: string } | null,
  tokenRows: null as { provider: string; encrypted_access_token: string }[] | null,
  tokenError: null as { message: string } | null,
}))

vi.mock('@/src/lib/supabase/server', () => ({
  supabaseServer: {
    from: vi.fn((table: string) => {
      const query: Record<string, unknown> = {}
      query.select = vi.fn(() => query)
      query.eq = vi.fn(() => query)
      query.in = vi.fn(() => query)
      query.maybeSingle = vi.fn(async () => ({ data: mocks.accountRow, error: mocks.accountError }))
      // The token lookup is now a plain array query (no .maybeSingle()) —
      // awaited directly via this thenable, matching every other
      // multi-row query mock in this codebase's test suite.
      query.then = ((resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
        Promise.resolve({ data: mocks.tokenRows, error: mocks.tokenError }).then(resolve, reject)) as unknown
      return query
    }),
  },
}))

vi.mock('./tokenCrypto', () => ({
  decryptToken: vi.fn((encrypted: string) => {
    if (encrypted === 'undecryptable') throw new Error('bad auth tag')
    return `decrypted:${encrypted}`
  }),
}))

import { resolveContentAccountForWorkspace, contentAccountFailureStatus } from './contentAccountResolution'

describe('resolveContentAccountForWorkspace', () => {
  beforeEach(() => {
    mocks.accountRow = null
    mocks.accountError = null
    mocks.tokenRows = null
    mocks.tokenError = null
  })

  it('CASE 1/2/7: resolves the workspace’s own active connected account + decrypted facebook_login content token', async () => {
    mocks.accountRow = { id: 'account-a', external_account_id: 'ig-business-a' }
    mocks.tokenRows = [{ provider: 'facebook_login', encrypted_access_token: 'enc-token-a' }]

    const result = await resolveContentAccountForWorkspace('workspace-a')

    expect(result).toEqual({
      ok: true,
      account: {
        connectedAccountId: 'account-a',
        instagramAccountId: 'ig-business-a',
        accessToken: 'decrypted:enc-token-a',
        provider: 'facebook_login',
      },
    })
  })

  it('Phase G: prefers an instagram_login token over a facebook_login one when both exist on the same connected account', async () => {
    mocks.accountRow = { id: 'account-a', external_account_id: 'ig-business-a' }
    mocks.tokenRows = [
      { provider: 'facebook_login', encrypted_access_token: 'enc-fb' },
      { provider: 'instagram_login', encrypted_access_token: 'enc-ig' },
    ]

    const result = await resolveContentAccountForWorkspace('workspace-a')

    expect(result).toEqual({
      ok: true,
      account: {
        connectedAccountId: 'account-a',
        instagramAccountId: 'ig-business-a',
        accessToken: 'decrypted:enc-ig',
        provider: 'instagram_login',
      },
    })
  })

  it('CASE 4: no connected account for this workspace fails closed as not_connected, never a global fallback', async () => {
    mocks.accountRow = null

    const result = await resolveContentAccountForWorkspace('workspace-b')

    expect(result).toEqual({
      ok: false,
      reason: 'not_connected',
      error: expect.stringContaining('no connected Instagram account'),
    })
    expect(contentAccountFailureStatus('not_connected')).toBe(400)
  })

  it('CASE 5: more than one active connected account (maybeSingle’s own ambiguity error) fails closed as ambiguous, never picks one', async () => {
    mocks.accountError = { message: 'multiple rows returned', code: 'PGRST116' }

    const result = await resolveContentAccountForWorkspace('workspace-a')

    expect(result).toEqual({
      ok: false,
      reason: 'ambiguous_accounts',
      error: expect.stringContaining('more than one active connected Instagram account'),
    })
    expect(contentAccountFailureStatus('ambiguous_accounts')).toBe(409)
  })

  it('a generic connected-account lookup error fails closed as lookup_failed (500), never falls through', async () => {
    mocks.accountError = { message: 'db unavailable' }

    const result = await resolveContentAccountForWorkspace('workspace-a')

    expect(result.ok).toBe(false)
    expect(result).toMatchObject({ reason: 'lookup_failed' })
    expect(contentAccountFailureStatus('lookup_failed')).toBe(500)
  })

  it('CASE 6: an active connected account with no stored content token fails closed as token_missing, never tries another account’s token', async () => {
    mocks.accountRow = { id: 'account-a', external_account_id: 'ig-business-a' }
    mocks.tokenRows = []

    const result = await resolveContentAccountForWorkspace('workspace-a')

    expect(result).toEqual({
      ok: false,
      reason: 'token_missing',
      error: expect.stringContaining('No Instagram content/insights token'),
    })
    expect(contentAccountFailureStatus('token_missing')).toBe(400)
  })

  it('CASE 6: a token lookup error fails closed as lookup_failed', async () => {
    mocks.accountRow = { id: 'account-a', external_account_id: 'ig-business-a' }
    mocks.tokenError = { message: 'db unavailable' }

    const result = await resolveContentAccountForWorkspace('workspace-a')

    expect(result).toMatchObject({ ok: false, reason: 'lookup_failed' })
  })

  it('CASE 6: a token that fails to decrypt fails closed as token_missing, never throws out of the resolver', async () => {
    mocks.accountRow = { id: 'account-a', external_account_id: 'ig-business-a' }
    mocks.tokenRows = [{ provider: 'facebook_login', encrypted_access_token: 'undecryptable' }]

    const result = await resolveContentAccountForWorkspace('workspace-a')

    expect(result).toEqual({
      ok: false,
      reason: 'token_missing',
      error: expect.stringContaining('could not be decrypted'),
    })
  })
})
