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
      for (const method of ['select', 'eq', 'insert', 'ilike']) {
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

import { provisionOwnWorkspace } from './provisionWorkspace'

beforeEach(() => {
  mocks.script = {}
  mocks.counters = {}
})

describe('provisionOwnWorkspace', () => {
  it('CASE 2: creates a brand-new workspace + owner membership for an admin with none', async () => {
    queue('social_workspaces', [{ data: { id: 'workspace-b' }, error: null }])
    queue('social_workspace_members', [{ data: null, error: null }])

    const result = await provisionOwnWorkspace('admin-b', 'alx.evolves@gmail.com')

    expect(result).toEqual({ ok: true, workspace: { workspaceId: 'workspace-b', created: true } })
  })

  it('a concurrent duplicate call reuses the winner’s workspace instead of creating a second one', async () => {
    queue('social_workspaces', [
      { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } },
      { data: { id: 'workspace-b' }, error: null }, // the winning concurrent call's row, found by name
    ])
    queue('social_workspace_members', [{ data: null, error: { code: '23505', message: 'duplicate key' } }])

    const result = await provisionOwnWorkspace('admin-b', 'alx.evolves@gmail.com')

    expect(result).toEqual({ ok: true, workspace: { workspaceId: 'workspace-b', created: false } })
  })

  it('fails closed on a non-conflict workspace insert error, never fabricates a workspace id', async () => {
    queue('social_workspaces', [{ data: null, error: { message: 'db unavailable' } }])

    const result = await provisionOwnWorkspace('admin-b', 'alx.evolves@gmail.com')

    expect(result).toEqual({ ok: false, error: expect.any(String) })
  })

  it('fails closed on a non-conflict membership insert error', async () => {
    queue('social_workspaces', [{ data: { id: 'workspace-b' }, error: null }])
    queue('social_workspace_members', [{ data: null, error: { message: 'db unavailable' } }])

    const result = await provisionOwnWorkspace('admin-b', 'alx.evolves@gmail.com')

    expect(result).toEqual({ ok: false, error: expect.any(String) })
  })
})
