import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/src/lib/supabase/server', () => ({ supabaseServer: {} }))
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return { ...actual, cache: <T>(fn: T) => fn }
})

const mocks = vi.hoisted(() => ({
  provisionResult: { ok: true, workspace: { workspaceId: 'provisioned', created: true } } as
    | { ok: true; workspace: { workspaceId: string; created: boolean } }
    | { ok: false; error: string },
}))

vi.mock('./provisionWorkspace', () => ({
  provisionOwnWorkspace: vi.fn(async () => mocks.provisionResult),
}))

import { ensureWritableSocialWorkspace } from './ensureSocialWorkspace'
import type { SocialWorkspaceScope } from '@/src/lib/admin/socialWorkspaceScope'
import { provisionOwnWorkspace } from './provisionWorkspace'

function scope(overrides: Partial<SocialWorkspaceScope> = {}): SocialWorkspaceScope {
  return {
    adminUserId: 'admin-b',
    canManageWorkspaces: false,
    memberWorkspaceIds: [],
    ownerWorkspaceIds: [],
    writableWorkspaceIds: [],
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.provisionResult = { ok: true, workspace: { workspaceId: 'provisioned', created: true } }
})

describe('ensureWritableSocialWorkspace', () => {
  it('CASE 2: provisions a new workspace for an admin with zero memberships', async () => {
    const result = await ensureWritableSocialWorkspace(scope(), 'alx.evolves@gmail.com')

    expect(provisionOwnWorkspace).toHaveBeenCalledWith('admin-b', 'alx.evolves@gmail.com')
    expect(result).toEqual({ ok: true, workspaceId: 'provisioned' })
  })

  it('CASE 1/3: an admin who already has a writable workspace is passed straight through — never re-provisioned', async () => {
    const result = await ensureWritableSocialWorkspace(scope({ memberWorkspaceIds: ['workspace-a'], writableWorkspaceIds: ['workspace-a'] }), 'owner@example.com')

    expect(provisionOwnWorkspace).not.toHaveBeenCalled()
    expect(result).toEqual({ ok: true, workspaceId: 'workspace-a' })
  })

  it('a member-but-read-only-elsewhere admin is NOT auto-provisioned a second workspace — fails exactly as resolveDefaultWritableWorkspaceId already does', async () => {
    const result = await ensureWritableSocialWorkspace(scope({ memberWorkspaceIds: ['workspace-a'], writableWorkspaceIds: [] }), 'analyst@example.com')

    expect(provisionOwnWorkspace).not.toHaveBeenCalled()
    expect(result).toEqual({ ok: false, error: expect.stringContaining('not an owner or manager') })
  })

  it('CASE 6: an admin with 2+ writable workspaces still fails closed — never silently picks one, never provisions a third', async () => {
    const result = await ensureWritableSocialWorkspace(
      scope({ memberWorkspaceIds: ['workspace-a', 'workspace-c'], writableWorkspaceIds: ['workspace-a', 'workspace-c'] }),
      'multi@example.com'
    )

    expect(provisionOwnWorkspace).not.toHaveBeenCalled()
    expect(result).toEqual({ ok: false, error: expect.stringContaining('Multiple Social Workspaces') })
  })

  it('surfaces a provisioning failure without fabricating a workspace id', async () => {
    mocks.provisionResult = { ok: false, error: 'db unavailable' }

    const result = await ensureWritableSocialWorkspace(scope(), 'alx.evolves@gmail.com')

    expect(result).toEqual({ ok: false, error: 'db unavailable' })
  })
})
