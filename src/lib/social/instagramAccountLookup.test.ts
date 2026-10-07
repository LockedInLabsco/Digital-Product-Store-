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
      for (const method of ['select', 'eq']) {
        chain[method] = vi.fn(() => chain)
      }
      chain.maybeSingle = vi.fn(async () => response)

      return chain
    }),
  },
}))

import { findConnectedAccountByMetaUserId } from './instagramAccountLookup'

beforeEach(() => {
  mocks.script = {}
  mocks.counters = {}
})

describe('findConnectedAccountByMetaUserId', () => {
  it('matches directly on external_account_id when the Meta user_id equals it', async () => {
    queue('social_connected_accounts', [{ data: { id: 'connected-a', workspace_id: 'workspace-a' }, error: null }])

    const result = await findConnectedAccountByMetaUserId('ig-business-a')

    expect(result).toEqual({ connectedAccountId: 'connected-a', workspaceId: 'workspace-a' })
  })

  it('falls back to social_connected_account_identifiers when no direct external_account_id match exists', async () => {
    queue('social_connected_accounts', [
      { data: null, error: null }, // no direct match
      { data: { id: 'connected-b', workspace_id: 'workspace-b' }, error: null }, // resolved via identifier
    ])
    queue('social_connected_account_identifiers', [{ data: { connected_account_id: 'connected-b' }, error: null }])

    const result = await findConnectedAccountByMetaUserId('some-other-id')

    expect(result).toEqual({ connectedAccountId: 'connected-b', workspaceId: 'workspace-b' })
  })

  it('returns null — never guesses — when nothing matches either way', async () => {
    queue('social_connected_accounts', [{ data: null, error: null }])
    queue('social_connected_account_identifiers', [{ data: null, error: null }])

    const result = await findConnectedAccountByMetaUserId('unknown-id')

    expect(result).toBeNull()
  })

  it('fails closed to null (never throws) on a lookup error', async () => {
    queue('social_connected_accounts', [{ data: null, error: { message: 'db unavailable' } }])
    queue('social_connected_account_identifiers', [{ data: null, error: null }])

    const result = await findConnectedAccountByMetaUserId('unknown-id')

    expect(result).toBeNull()
  })
})
