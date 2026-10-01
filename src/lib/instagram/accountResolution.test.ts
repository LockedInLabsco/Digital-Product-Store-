import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  identifierRow: null as { connected_account_id: string } | null,
  identifierError: null as { message: string } | null,
  accountRow: null as { id: string; workspace_id: string; status: string } | null,
  accountError: null as { message: string } | null,
}))

vi.mock('@/src/lib/supabase/server', () => ({
  supabaseServer: {
    from: vi.fn((table: string) => {
      const query: Record<string, ReturnType<typeof vi.fn>> = {}
      query.select = vi.fn(() => query)
      query.eq = vi.fn(() => query)
      query.maybeSingle = vi.fn(async () => {
        if (table === 'social_connected_account_identifiers') {
          return { data: mocks.identifierRow, error: mocks.identifierError }
        }
        return { data: mocks.accountRow, error: mocks.accountError }
      })
      return query
    }),
  },
}))

import { resolveConnectedAccountFromWebhookEntryId } from './accountResolution'

describe('resolveConnectedAccountFromWebhookEntryId', () => {
  beforeEach(() => {
    mocks.identifierRow = null
    mocks.identifierError = null
    mocks.accountRow = null
    mocks.accountError = null
  })

  it('3. an unknown entry.id resolves to null — zero automation runs', async () => {
    mocks.identifierRow = null
    expect(await resolveConnectedAccountFromWebhookEntryId('unknown-entry-id')).toBeNull()
  })

  it('1/2. resolves a known entry.id to its connected account + workspace', async () => {
    mocks.identifierRow = { connected_account_id: 'account-a' }
    mocks.accountRow = { id: 'account-a', workspace_id: 'workspace-a', status: 'active' }
    expect(await resolveConnectedAccountFromWebhookEntryId('entry-a')).toEqual({
      connectedAccountId: 'account-a',
      workspaceId: 'workspace-a',
    })
  })

  it('9. a disconnected account resolves to null even if the identifier matches', async () => {
    mocks.identifierRow = { connected_account_id: 'account-a' }
    mocks.accountRow = { id: 'account-a', workspace_id: 'workspace-a', status: 'disconnected' }
    expect(await resolveConnectedAccountFromWebhookEntryId('entry-a')).toBeNull()
  })

  it('fails closed (null, never throws) on a lookup error — never falls back to a guess', async () => {
    mocks.identifierError = { message: 'db unavailable' }
    await expect(resolveConnectedAccountFromWebhookEntryId('entry-a')).resolves.toBeNull()
  })

  it('an empty entry id resolves to null without querying', async () => {
    expect(await resolveConnectedAccountFromWebhookEntryId('')).toBeNull()
  })
})
