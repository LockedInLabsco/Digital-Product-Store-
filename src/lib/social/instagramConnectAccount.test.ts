import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

interface CannedResponse {
  data: unknown
  error: unknown
}

const mocks = vi.hoisted(() => ({
  script: {} as Record<string, CannedResponse[]>,
  counters: {} as Record<string, number>,
}))

function queue(table: string, responses: CannedResponse[]) {
  mocks.script[table] = responses
}

vi.mock('@/src/lib/supabase/server', () => ({
  supabaseServer: {
    from: vi.fn((table: string) => {
      const idx = mocks.counters[table] ?? 0
      mocks.counters[table] = idx + 1
      const response = mocks.script[table]?.[idx] ?? { data: null, error: null }

      const chain: Record<string, unknown> = {}
      for (const method of ['select', 'eq', 'update', 'insert', 'upsert', 'delete', 'order', 'in']) {
        chain[method] = vi.fn(() => chain)
      }
      chain.maybeSingle = vi.fn(async () => response)
      chain.single = vi.fn(async () => response)
      chain.then = ((resolve: (v: CannedResponse) => unknown, reject?: (e: unknown) => unknown) =>
        Promise.resolve(response).then(resolve, reject)) as unknown

      return chain
    }),
  },
}))

vi.mock('@/src/lib/instagram/tokenCrypto', () => ({
  encryptToken: vi.fn((token: string) => `encrypted:${token}`),
}))

import { upsertConnectedInstagramAccount, disconnectInstagramAccount } from './instagramConnectAccount'

const BASE_RESOLVED = {
  instagramAccountId: 'ig-account-a',
  username: 'brand_a',
  displayName: 'Brand A',
  pageAccessToken: 'page-token-a',
  tokenExpiresAt: '2027-01-01T00:00:00.000Z',
}

beforeEach(() => {
  mocks.script = {}
  mocks.counters = {}
})

describe('upsertConnectedInstagramAccount', () => {
  it('CASE 1/2: creates a brand-new connected account, token, and identifier for a workspace with none yet', async () => {
    queue('social_connected_accounts', [
      { data: null, error: null }, // lookup by external_id — none exists anywhere
      { data: null, error: null }, // lookup this workspace's active account — none
      { data: { id: 'connected-a' }, error: null }, // insert
    ])
    queue('social_account_tokens', [{ data: null, error: null }])
    queue('social_connected_account_identifiers', [{ data: null, error: null }])

    const result = await upsertConnectedInstagramAccount('workspace-a', 'admin-a', BASE_RESOLVED)

    expect(result).toEqual({ ok: true, connectedAccountId: 'connected-a', reauthorized: false, replacedPreviousAccount: false })
  })

  it('reauthorizes the SAME account already connected to THIS workspace — no replacement', async () => {
    queue('social_connected_accounts', [
      { data: { id: 'connected-a', workspace_id: 'workspace-a' }, error: null }, // lookup by external_id — same workspace
      { data: null, error: null }, // update (reauthorize)
    ])
    queue('social_account_tokens', [{ data: null, error: null }])
    queue('social_connected_account_identifiers', [{ data: null, error: null }])

    const result = await upsertConnectedInstagramAccount('workspace-a', 'admin-a', BASE_RESOLVED)

    expect(result).toEqual({ ok: true, connectedAccountId: 'connected-a', reauthorized: true, replacedPreviousAccount: false })
  })

  it('CASE 7: a workspace with a DIFFERENT active account gets it replaced explicitly, never silently', async () => {
    queue('social_connected_accounts', [
      { data: null, error: null }, // lookup by external_id — this new account isn't connected anywhere yet
      { data: { id: 'connected-old' }, error: null }, // this workspace's current active account
      { data: null, error: null }, // update old -> disconnected
      { data: { id: 'connected-new' }, error: null }, // insert new
    ])
    queue('social_account_tokens', [{ data: null, error: null }])
    queue('social_connected_account_identifiers', [{ data: null, error: null }])

    const result = await upsertConnectedInstagramAccount('workspace-a', 'admin-a', BASE_RESOLVED)

    expect(result).toEqual({ ok: true, connectedAccountId: 'connected-new', reauthorized: false, replacedPreviousAccount: true })
  })

  it('CASE 3/security: rejects connecting an account already active on a DIFFERENT workspace — never moves it, never overwrites', async () => {
    queue('social_connected_accounts', [{ data: { id: 'connected-b', workspace_id: 'workspace-b' }, error: null }])

    const result = await upsertConnectedInstagramAccount('workspace-a', 'admin-a', BASE_RESOLVED)

    expect(result).toEqual({
      ok: false,
      reason: 'already_connected_elsewhere',
      error: expect.stringContaining('already connected to a different Social Workspace'),
    })
  })

  it('fails closed (write_failed) on a lookup error, never falls through to writing anything', async () => {
    queue('social_connected_accounts', [{ data: null, error: { message: 'db unavailable' } }])

    const result = await upsertConnectedInstagramAccount('workspace-a', 'admin-a', BASE_RESOLVED)

    expect(result).toMatchObject({ ok: false, reason: 'write_failed' })
  })

  it('CASE 6: an insert failure after the lookup steps reports write_failed, never a partial ok result', async () => {
    queue('social_connected_accounts', [
      { data: null, error: null },
      { data: null, error: null },
      { data: null, error: { message: 'insert failed' } },
    ])

    const result = await upsertConnectedInstagramAccount('workspace-a', 'admin-a', BASE_RESOLVED)

    expect(result).toMatchObject({ ok: false, reason: 'write_failed' })
  })
})

describe('disconnectInstagramAccount', () => {
  it('CASE 8: marks the active account disconnected and deletes its token row', async () => {
    queue('social_connected_accounts', [{ data: { id: 'connected-a' }, error: null }, { data: null, error: null }])
    queue('social_account_tokens', [{ data: null, error: null }])

    const result = await disconnectInstagramAccount('workspace-a')

    expect(result).toEqual({ ok: true })
  })

  it('reports not_connected rather than silently succeeding when there is nothing to disconnect', async () => {
    queue('social_connected_accounts', [{ data: null, error: null }])

    const result = await disconnectInstagramAccount('workspace-b')

    expect(result).toEqual({ ok: false, reason: 'not_connected', error: expect.any(String) })
  })
})
