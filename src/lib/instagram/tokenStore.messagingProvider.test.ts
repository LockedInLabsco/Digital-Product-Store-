import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  eqCalls: [] as { column: string; value: unknown }[],
  row: null as { id: string; encrypted_access_token: string } | null,
}))

vi.mock('@/src/lib/supabase/server', () => ({
  supabaseServer: {
    from: vi.fn(() => {
      const chain: Record<string, unknown> = {}
      chain.select = vi.fn(() => chain)
      chain.eq = vi.fn((column: string, value: unknown) => {
        mocks.eqCalls.push({ column, value })
        return chain
      })
      chain.maybeSingle = vi.fn(async () => ({ data: mocks.row, error: null }))
      return chain
    }),
  },
}))

vi.mock('./tokenCrypto', () => ({
  decryptToken: vi.fn((value: string) => value.replace('encrypted:', '')),
  encryptToken: vi.fn((value: string) => `encrypted:${value}`),
}))

import { getMessagingTokenForAccount } from './tokenStore'

beforeEach(() => {
  mocks.eqCalls = []
  mocks.row = { id: 'row-1', encrypted_access_token: 'encrypted:secret-token' }
})

describe('getMessagingTokenForAccount — provider-aware (N4N DM Automations)', () => {
  it('defaults to provider "instagram_login" when no provider is passed — every pre-existing caller is unchanged', async () => {
    await getMessagingTokenForAccount('account-1')
    expect(mocks.eqCalls).toContainEqual({ column: 'provider', value: 'instagram_login' })
  })

  it('queries exactly the requested provider when "instagram_dm" is passed explicitly — never falls back to instagram_login', async () => {
    await getMessagingTokenForAccount('account-1', 'instagram_dm')
    expect(mocks.eqCalls).toContainEqual({ column: 'provider', value: 'instagram_dm' })
    expect(mocks.eqCalls).not.toContainEqual({ column: 'provider', value: 'instagram_login' })
  })

  it('returns null (no fallback) when the requested provider has no stored row — proves the DM flow fails cleanly instead of silently using another provider’s token', async () => {
    mocks.row = null
    const result = await getMessagingTokenForAccount('account-1', 'instagram_dm')
    expect(result).toBeNull()
  })
})
