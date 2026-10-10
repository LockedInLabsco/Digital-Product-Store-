import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  insertError: null as { message: string } | null,
  deleteRow: null as { admin_user_id: string; workspace_id: string; expires_at: string } | null,
  deleteError: null as { message: string } | null,
  lastInsertPayload: null as Record<string, unknown> | null,
}))

vi.mock('@/src/lib/supabase/server', () => ({
  supabaseServer: {
    from: vi.fn(() => {
      const chain: Record<string, unknown> = {}
      chain.insert = vi.fn((payload: Record<string, unknown>) => {
        mocks.lastInsertPayload = payload
        return chain
      })
      chain.delete = vi.fn(() => chain)
      chain.eq = vi.fn(() => chain)
      chain.select = vi.fn(() => chain)
      chain.maybeSingle = vi.fn(async () => ({ data: mocks.deleteRow, error: mocks.deleteError }))
      chain.then = ((resolve: (v: { error: unknown }) => unknown) =>
        Promise.resolve({ error: mocks.insertError }).then(resolve)) as unknown
      return chain
    }),
  },
}))

import { createInstagramOAuthState, consumeInstagramOAuthState } from './instagramOAuthState'

beforeEach(() => {
  mocks.insertError = null
  mocks.deleteRow = null
  mocks.deleteError = null
  mocks.lastInsertPayload = null
})

describe('createInstagramOAuthState', () => {
  it('creates an unguessable, sufficiently long state value bound to the given admin + workspace', async () => {
    const state = await createInstagramOAuthState({ adminUserId: 'admin-a', workspaceId: 'workspace-a' })

    expect(state.length).toBeGreaterThanOrEqual(32)
    expect(mocks.lastInsertPayload).toMatchObject({ admin_user_id: 'admin-a', workspace_id: 'workspace-a', flow: 'instagram_connect' })
  })

  it('throws rather than silently succeeding if the insert fails', async () => {
    mocks.insertError = { message: 'db unavailable' }
    await expect(createInstagramOAuthState({ adminUserId: 'admin-a', workspaceId: 'workspace-a' })).rejects.toThrow(/db unavailable/)
  })

  it('N4N DM Automations: accepts the new "instagram_dm_connect" flow value, additive alongside the existing two', async () => {
    const state = await createInstagramOAuthState({ adminUserId: 'admin-a', workspaceId: 'workspace-a' }, 'instagram_dm_connect')

    expect(state.length).toBeGreaterThanOrEqual(32)
    expect(mocks.lastInsertPayload).toMatchObject({ admin_user_id: 'admin-a', workspace_id: 'workspace-a', flow: 'instagram_dm_connect' })
  })
})

describe('consumeInstagramOAuthState', () => {
  it('CASE 1/2: pops a valid, unexpired state and returns its bound admin/workspace', async () => {
    mocks.deleteRow = { admin_user_id: 'admin-a', workspace_id: 'workspace-a', expires_at: new Date(Date.now() + 60_000).toISOString() }

    const result = await consumeInstagramOAuthState('a-valid-state-value')

    expect(result).toEqual({ ok: true, payload: { adminUserId: 'admin-a', workspaceId: 'workspace-a' } })
  })

  it('CASE 4: an empty state is rejected without querying the database at all', async () => {
    const result = await consumeInstagramOAuthState('')
    expect(result).toEqual({ ok: false, reason: 'missing_or_already_used', error: expect.any(String) })
  })

  it('CASE 3/4: a missing or already-consumed state is rejected — never falls back to guessing an admin/workspace', async () => {
    mocks.deleteRow = null

    const result = await consumeInstagramOAuthState('unknown-or-replayed-state')

    expect(result).toEqual({ ok: false, reason: 'missing_or_already_used', error: expect.any(String) })
  })

  it('CASE 4: an expired state is rejected even though it was found and popped', async () => {
    mocks.deleteRow = { admin_user_id: 'admin-a', workspace_id: 'workspace-a', expires_at: new Date(Date.now() - 60_000).toISOString() }

    const result = await consumeInstagramOAuthState('an-expired-state')

    expect(result).toEqual({ ok: false, reason: 'expired', error: expect.any(String) })
  })

  it('fails closed on a database error, never returns a usable payload', async () => {
    mocks.deleteError = { message: 'db unavailable' }

    const result = await consumeInstagramOAuthState('some-state')

    expect(result).toEqual({ ok: false, reason: 'lookup_failed', error: expect.any(String) })
  })
})
