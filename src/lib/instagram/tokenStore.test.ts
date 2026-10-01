import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  rows: [] as { connected_account_id: string }[],
  error: null as { message: string } | null,
}))

vi.mock('@/src/lib/supabase/server', () => ({
  supabaseServer: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(async () => ({ data: mocks.rows, error: mocks.error })),
      })),
    })),
  },
}))

import { resolveLegacySingleConnectedAccountId } from './tokenStore'

describe('resolveLegacySingleConnectedAccountId (transitional compatibility resolver)', () => {
  beforeEach(() => {
    mocks.rows = []
    mocks.error = null
  })

  it('returns null — not an arbitrary guess — when no account has migrated a token yet', async () => {
    mocks.rows = []
    expect(await resolveLegacySingleConnectedAccountId()).toBeNull()
  })

  it('resolves the one account unambiguously when exactly one has a migrated token', async () => {
    mocks.rows = [{ connected_account_id: 'account-a' }]
    expect(await resolveLegacySingleConnectedAccountId()).toBe('account-a')
  })

  it('15. NEVER silently picks a "first" account — throws once a second connected account has migrated', async () => {
    mocks.rows = [{ connected_account_id: 'account-a' }, { connected_account_id: 'account-b' }]
    await expect(resolveLegacySingleConnectedAccountId()).rejects.toThrow(/no longer unambiguous/)
  })
})
