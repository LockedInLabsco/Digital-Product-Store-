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

      const query: Record<string, unknown> = {}
      query.select = vi.fn(() => query)
      query.eq = vi.fn(() => query)
      query.maybeSingle = vi.fn(async () => response)
      return query
    }),
  },
}))

import { resolveConnectedAccountFromWebhookEntryId } from './accountResolution'

beforeEach(() => {
  mocks.script = {}
  mocks.counters = {}
})

describe('resolveConnectedAccountFromWebhookEntryId', () => {
  it('1. resolves directly via external_account_id — covers either connect method, since both populate it identically', async () => {
    queue('social_connected_accounts', [{ data: { id: 'account-a', workspace_id: 'workspace-a', status: 'active' }, error: null }])

    const result = await resolveConnectedAccountFromWebhookEntryId('entry-a')

    expect(result).toEqual({ connectedAccountId: 'account-a', workspaceId: 'workspace-a' })
  })

  it('2. falls back to social_connected_account_identifiers when entry.id does not match external_account_id directly', async () => {
    queue('social_connected_accounts', [
      { data: null, error: null }, // no direct external_account_id match
      { data: { id: 'account-a', workspace_id: 'workspace-a', status: 'active' }, error: null }, // lookup by id after identifier match
    ])
    queue('social_connected_account_identifiers', [{ data: { connected_account_id: 'account-a' }, error: null }])

    const result = await resolveConnectedAccountFromWebhookEntryId('webhook-entry-id-a')

    expect(result).toEqual({ connectedAccountId: 'account-a', workspaceId: 'workspace-a' })
  })

  it('3. an unknown entry.id resolves to null — zero automation runs, never a guess', async () => {
    queue('social_connected_accounts', [{ data: null, error: null }])
    queue('social_connected_account_identifiers', [{ data: null, error: null }])

    expect(await resolveConnectedAccountFromWebhookEntryId('unknown-entry-id')).toBeNull()
  })

  it('9. a disconnected account resolves to null even when external_account_id matches directly', async () => {
    queue('social_connected_accounts', [{ data: { id: 'account-a', workspace_id: 'workspace-a', status: 'disconnected' }, error: null }])

    expect(await resolveConnectedAccountFromWebhookEntryId('entry-a')).toBeNull()
  })

  it('a disconnected account resolves to null via the identifier-fallback path too', async () => {
    queue('social_connected_accounts', [
      { data: null, error: null },
      { data: { id: 'account-a', workspace_id: 'workspace-a', status: 'disconnected' }, error: null },
    ])
    queue('social_connected_account_identifiers', [{ data: { connected_account_id: 'account-a' }, error: null }])

    expect(await resolveConnectedAccountFromWebhookEntryId('webhook-entry-id-a')).toBeNull()
  })

  it('fails closed (null, never throws) on an external_account_id lookup error, never falls through to a guess', async () => {
    queue('social_connected_accounts', [{ data: null, error: { message: 'db unavailable' } }])

    await expect(resolveConnectedAccountFromWebhookEntryId('entry-a')).resolves.toBeNull()
  })

  it('fails closed (null, never throws) on an identifier lookup error', async () => {
    queue('social_connected_accounts', [{ data: null, error: null }])
    queue('social_connected_account_identifiers', [{ data: null, error: { message: 'db unavailable' } }])

    await expect(resolveConnectedAccountFromWebhookEntryId('entry-a')).resolves.toBeNull()
  })

  it('an empty entry id resolves to null without querying', async () => {
    expect(await resolveConnectedAccountFromWebhookEntryId('')).toBeNull()
  })
})
