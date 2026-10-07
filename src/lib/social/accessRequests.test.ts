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
      for (const method of ['select', 'eq', 'update', 'insert', 'order', 'in']) {
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

import { requestWorkspaceAccess, resolveAccessRequest, cancelAccessRequest, listPendingAccessRequests } from './accessRequests'

beforeEach(() => {
  mocks.script = {}
  mocks.counters = {}
})

describe('requestWorkspaceAccess', () => {
  it('CASE 7: returns account_not_found when the external id matches no active connected account — no forged-id grant possible', async () => {
    queue('social_connected_accounts', [{ data: null, error: null }])

    const result = await requestWorkspaceAccess('admin-b', 'ig-forged-id')

    expect(result).toEqual({ ok: false, reason: 'account_not_found', error: expect.any(String) })
  })

  it('edge case 1: already_member — no request created when the requester already belongs to the target workspace', async () => {
    queue('social_connected_accounts', [{ data: { id: 'connected-a', workspace_id: 'workspace-a' }, error: null }])
    queue('social_workspace_members', [{ data: { id: 'member-row' }, error: null }])

    const result = await requestWorkspaceAccess('admin-b', 'ig-account-a')

    expect(result).toEqual({ ok: true, status: 'already_member' })
  })

  it('CASE 1/2: creates a fresh pending request when none exists yet', async () => {
    queue('social_connected_accounts', [{ data: { id: 'connected-a', workspace_id: 'workspace-a' }, error: null }])
    queue('social_workspace_members', [{ data: null, error: null }])
    queue('social_workspace_access_requests', [{ data: { id: 'request-1' }, error: null }])

    const result = await requestWorkspaceAccess('admin-b', 'ig-account-a')

    expect(result).toEqual({ ok: true, status: 'pending', requestId: 'request-1' })
  })

  it('CASE 3: a duplicate attempt returns the existing pending request instead of creating a second one', async () => {
    queue('social_connected_accounts', [{ data: { id: 'connected-a', workspace_id: 'workspace-a' }, error: null }])
    queue('social_workspace_members', [{ data: null, error: null }])
    queue('social_workspace_access_requests', [
      { data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint' } },
      { data: { id: 'request-1' }, error: null }, // the already-pending row, looked up after the conflict
    ])

    const result = await requestWorkspaceAccess('admin-b', 'ig-account-a')

    expect(result).toEqual({ ok: true, status: 'already_pending', requestId: 'request-1' })
  })
})

describe('cancelAccessRequest', () => {
  it('cancels a pending request scoped to its own requester', async () => {
    queue('social_workspace_access_requests', [{ data: { id: 'request-1' }, error: null }])

    const result = await cancelAccessRequest('request-1', 'admin-b')

    expect(result).toEqual({ ok: true })
  })

  it('returns not_found when there is nothing pending to cancel', async () => {
    queue('social_workspace_access_requests', [{ data: null, error: null }])

    const result = await cancelAccessRequest('request-1', 'admin-b')

    expect(result).toEqual({ ok: false, reason: 'not_found', error: expect.any(String) })
  })
})

describe('resolveAccessRequest', () => {
  it('CASE (not found): rejects a requestId that does not belong to this workspace', async () => {
    queue('social_workspace_access_requests', [{ data: null, error: null }])

    const result = await resolveAccessRequest('workspace-a', 'request-x', 'owner-a', 'approved', 'manager')

    expect(result).toEqual({ ok: false, reason: 'not_found', error: expect.any(String) })
  })

  it('CASE 3: approving an already-resolved request is a safe no-op, never a duplicate membership', async () => {
    queue('social_workspace_access_requests', [{ data: { id: 'request-1', status: 'approved', requesting_admin_user_id: 'admin-b' }, error: null }])

    const result = await resolveAccessRequest('workspace-a', 'request-1', 'owner-a', 'approved', 'manager')

    expect(result).toEqual({ ok: true, status: 'already_resolved', resolvedStatus: 'approved' })
  })

  it('CASE 5: approval inserts a normal social_workspace_members row with the owner-chosen role, then marks the request approved', async () => {
    queue('social_workspace_access_requests', [
      { data: { id: 'request-1', status: 'pending', requesting_admin_user_id: 'admin-b' }, error: null }, // load
      { data: null, error: null }, // status update
    ])
    queue('social_workspace_members', [{ data: null, error: null }])

    const result = await resolveAccessRequest('workspace-a', 'request-1', 'owner-a', 'approved', 'manager')

    expect(result).toEqual({ ok: true, status: 'approved' })
  })

  it('approval tolerates the requester already having been added some other way (23505 on the membership insert)', async () => {
    queue('social_workspace_access_requests', [
      { data: { id: 'request-1', status: 'pending', requesting_admin_user_id: 'admin-b' }, error: null },
      { data: null, error: null },
    ])
    queue('social_workspace_members', [{ data: null, error: { code: '23505', message: 'duplicate key' } }])

    const result = await resolveAccessRequest('workspace-a', 'request-1', 'owner-a', 'approved', 'manager')

    expect(result).toEqual({ ok: true, status: 'approved' })
  })

  it('CASE 6: rejection updates status without ever touching social_workspace_members', async () => {
    queue('social_workspace_access_requests', [
      { data: { id: 'request-1', status: 'pending', requesting_admin_user_id: 'admin-b' }, error: null },
      { data: null, error: null },
    ])

    const result = await resolveAccessRequest('workspace-a', 'request-1', 'owner-a', 'rejected', null)

    expect(result).toEqual({ ok: true, status: 'rejected' })
    expect(mocks.counters['social_workspace_members']).toBeUndefined()
  })

  it('fails closed if approval is attempted with no role chosen', async () => {
    queue('social_workspace_access_requests', [{ data: { id: 'request-1', status: 'pending', requesting_admin_user_id: 'admin-b' }, error: null }])

    const result = await resolveAccessRequest('workspace-a', 'request-1', 'owner-a', 'approved', null)

    expect(result).toEqual({ ok: false, reason: 'write_failed', error: expect.any(String) })
  })
})

describe('listPendingAccessRequests', () => {
  it('joins the requester’s email onto each pending request', async () => {
    queue('social_workspace_access_requests', [
      {
        data: [{ id: 'request-1', workspace_id: 'workspace-a', requesting_admin_user_id: 'admin-b', status: 'pending', created_at: 't' }],
        error: null,
      },
    ])
    queue('admin_users', [{ data: [{ id: 'admin-b', email: 'alex@example.com' }], error: null }])

    const result = await listPendingAccessRequests('workspace-a')

    expect(result).toEqual([
      expect.objectContaining({ id: 'request-1', requester_email: 'alex@example.com' }),
    ])
  })
})
