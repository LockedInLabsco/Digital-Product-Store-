import { describe, expect, it, vi } from 'vitest'

// See workScope.test.ts for why these two mocks are required before
// import: 'server-only' throws unconditionally outside Next's RSC
// bundler, and React's cache() export isn't resolvable under vitest's
// plain 'react' resolution. Neither is exercised by the pure functions
// under test here.
vi.mock('server-only', () => ({}))
vi.mock('@/src/lib/supabase/server', () => ({ supabaseServer: {} }))
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return { ...actual, cache: <T>(fn: T) => fn }
})

import {
  canReadWorkspace,
  canAccessWorkspace,
  canWriteWorkspace,
  canManageWorkspaceMembers,
  canManageConnectedAccount,
  canReadAnalytics,
  canManageAutomations,
  canCreateWorkspace,
  canAccessLegacyUnmigratedAutomationData,
  resolveDefaultWritableWorkspaceId,
  type SocialWorkspaceScope,
} from './socialWorkspaceScope'

const WORKSPACE_A = 'workspace-a'
const WORKSPACE_B = 'workspace-b'

// Founder/Owner holding social:manage_workspaces, but with NO membership
// row in any workspace — the exact scenario the audit's "no invisible
// bypass" requirement is about.
const founderNoMembershipScope: SocialWorkspaceScope = {
  adminUserId: 'founder-1',
  canManageWorkspaces: true,
  memberWorkspaceIds: [],
  ownerWorkspaceIds: [],
  writableWorkspaceIds: [],
}

// A workspace-A owner (also the typical "Darshana" shape).
const workspaceAOwnerScope: SocialWorkspaceScope = {
  adminUserId: 'owner-a',
  canManageWorkspaces: false,
  memberWorkspaceIds: [WORKSPACE_A],
  ownerWorkspaceIds: [WORKSPACE_A],
  writableWorkspaceIds: [WORKSPACE_A],
}

const workspaceAManagerScope: SocialWorkspaceScope = {
  adminUserId: 'manager-a',
  canManageWorkspaces: false,
  memberWorkspaceIds: [WORKSPACE_A],
  ownerWorkspaceIds: [],
  writableWorkspaceIds: [WORKSPACE_A],
}

const workspaceAAnalystScope: SocialWorkspaceScope = {
  adminUserId: 'analyst-a',
  canManageWorkspaces: false,
  memberWorkspaceIds: [WORKSPACE_A],
  ownerWorkspaceIds: [],
  writableWorkspaceIds: [],
}

// Developer role with social:read_own (so getSocialWorkspaceScope would
// return a non-null scope) but genuinely no workspace membership at all.
const developerNoMembershipScope: SocialWorkspaceScope = {
  adminUserId: 'developer-1',
  canManageWorkspaces: false,
  memberWorkspaceIds: [],
  ownerWorkspaceIds: [],
  writableWorkspaceIds: [],
}

describe('canReadWorkspace / canAccessWorkspace', () => {
  it('1. a workspace A member can read workspace A', () => {
    expect(canReadWorkspace(workspaceAOwnerScope, WORKSPACE_A)).toBe(true)
    expect(canAccessWorkspace(workspaceAOwnerScope, WORKSPACE_A)).toBe(true)
  })

  it('2. a workspace A member cannot read workspace B', () => {
    expect(canReadWorkspace(workspaceAOwnerScope, WORKSPACE_B)).toBe(false)
  })

  it('7. a global Owner (social:manage_workspaces) with NO membership cannot read private workspace data', () => {
    expect(canReadWorkspace(founderNoMembershipScope, WORKSPACE_A)).toBe(false)
    expect(canReadWorkspace(founderNoMembershipScope, WORKSPACE_B)).toBe(false)
  })

  it('9. a Developer with no workspace membership cannot read private workspace data', () => {
    expect(canReadWorkspace(developerNoMembershipScope, WORKSPACE_A)).toBe(false)
  })

  it('10. an analyst can read workspace content', () => {
    expect(canReadWorkspace(workspaceAAnalystScope, WORKSPACE_A)).toBe(true)
    expect(canReadAnalytics(workspaceAAnalystScope, WORKSPACE_A)).toBe(true)
  })

  it('13. membership that no longer exists in scope (revoked) grants no access — scope reflects current DB state only', () => {
    // Simulates "after removal" by simply never having the membership —
    // getSocialWorkspaceScope() re-queries social_workspace_members on
    // every request, so a revoked membership never appears in a freshly
    // resolved scope. See the implementation report for why this is
    // sufficient (no caching layer to invalidate).
    const revokedScope: SocialWorkspaceScope = { ...workspaceAOwnerScope, memberWorkspaceIds: [], ownerWorkspaceIds: [], writableWorkspaceIds: [] }
    expect(canReadWorkspace(revokedScope, WORKSPACE_A)).toBe(false)
  })
})

describe('canWriteWorkspace', () => {
  it('10. an analyst cannot write', () => {
    expect(canWriteWorkspace(workspaceAAnalystScope, WORKSPACE_A)).toBe(false)
    expect(canManageAutomations(workspaceAAnalystScope, WORKSPACE_A)).toBe(false)
    expect(canManageConnectedAccount(workspaceAAnalystScope, WORKSPACE_A)).toBe(false)
  })

  it('11. a manager can write operational data', () => {
    expect(canWriteWorkspace(workspaceAManagerScope, WORKSPACE_A)).toBe(true)
    expect(canManageAutomations(workspaceAManagerScope, WORKSPACE_A)).toBe(true)
    expect(canManageConnectedAccount(workspaceAManagerScope, WORKSPACE_A)).toBe(true)
  })

  it('3. a workspace A manager cannot write to workspace B by addressing it directly', () => {
    expect(canWriteWorkspace(workspaceAManagerScope, WORKSPACE_B)).toBe(false)
  })
})

describe('canManageWorkspaceMembers', () => {
  it('11. a manager cannot manage workspace membership', () => {
    expect(canManageWorkspaceMembers(workspaceAManagerScope, WORKSPACE_A)).toBe(false)
  })

  it('12. a workspace owner can manage membership of their own workspace', () => {
    expect(canManageWorkspaceMembers(workspaceAOwnerScope, WORKSPACE_A)).toBe(true)
  })

  it('a workspace A owner cannot manage workspace B membership', () => {
    expect(canManageWorkspaceMembers(workspaceAOwnerScope, WORKSPACE_B)).toBe(false)
  })

  it('8. global Owner with social:manage_workspaces CAN manage any workspace membership...', () => {
    expect(canManageWorkspaceMembers(founderNoMembershipScope, WORKSPACE_A)).toBe(true)
    expect(canManageWorkspaceMembers(founderNoMembershipScope, WORKSPACE_B)).toBe(true)
  })

  it('8. ...WITHOUT being able to read that workspace\'s content — the core "no bypass" guarantee', () => {
    expect(canManageWorkspaceMembers(founderNoMembershipScope, WORKSPACE_A)).toBe(true)
    expect(canReadWorkspace(founderNoMembershipScope, WORKSPACE_A)).toBe(false)
  })
})

describe('canCreateWorkspace', () => {
  it('only social:manage_workspaces can create a workspace — not even a workspace owner', () => {
    expect(canCreateWorkspace(founderNoMembershipScope)).toBe(true)
    expect(canCreateWorkspace(workspaceAOwnerScope)).toBe(false)
  })
})

describe('resolveDefaultWritableWorkspaceId', () => {
  it('resolves the single writable workspace unambiguously', () => {
    const result = resolveDefaultWritableWorkspaceId(workspaceAOwnerScope)
    expect(result).toEqual({ ok: true, workspaceId: WORKSPACE_A })
  })

  it('errors rather than guessing when zero writable workspaces exist', () => {
    const result = resolveDefaultWritableWorkspaceId(workspaceAAnalystScope)
    expect(result.ok).toBe(false)
  })

  it('15. errors rather than guessing when multiple writable workspaces exist — never silently picks one', () => {
    const multiScope: SocialWorkspaceScope = { ...workspaceAOwnerScope, writableWorkspaceIds: [WORKSPACE_A, WORKSPACE_B] }
    const result = resolveDefaultWritableWorkspaceId(multiScope)
    expect(result.ok).toBe(false)
  })
})

describe('canAccessLegacyUnmigratedAutomationData (transitional)', () => {
  it('15. true only when the caller is writable-owner of exactly one workspace — never for zero or multiple', () => {
    expect(canAccessLegacyUnmigratedAutomationData(workspaceAOwnerScope)).toBe(true)
    expect(canAccessLegacyUnmigratedAutomationData(founderNoMembershipScope)).toBe(false)
    const multiScope: SocialWorkspaceScope = { ...workspaceAOwnerScope, writableWorkspaceIds: [WORKSPACE_A, WORKSPACE_B] }
    expect(canAccessLegacyUnmigratedAutomationData(multiScope)).toBe(false)
  })
})
