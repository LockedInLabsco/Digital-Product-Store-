import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/src/lib/supabase/server', () => ({ supabaseServer: {} }))
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return { ...actual, cache: <T>(fn: T) => fn }
})

import { canAccessAutomationAccount } from './automationAccountScope'
import type { SocialWorkspaceScope } from '@/src/lib/admin/socialWorkspaceScope'

const ACCOUNT_A = 'account-a'
const ACCOUNT_B = 'account-b'

const singleWorkspaceOwnerScope: SocialWorkspaceScope = {
  adminUserId: 'owner-a',
  canManageWorkspaces: false,
  memberWorkspaceIds: ['workspace-a'],
  ownerWorkspaceIds: ['workspace-a'],
  writableWorkspaceIds: ['workspace-a'],
}

const noMembershipScope: SocialWorkspaceScope = {
  adminUserId: 'someone',
  canManageWorkspaces: false,
  memberWorkspaceIds: [],
  ownerWorkspaceIds: [],
  writableWorkspaceIds: [],
}

describe('canAccessAutomationAccount', () => {
  it('4. a member can access their own connected account\'s automation data', () => {
    expect(canAccessAutomationAccount(singleWorkspaceOwnerScope, [ACCOUNT_A], ACCOUNT_A)).toBe(true)
  })

  it('5. a member cannot access another connected account\'s automation rules', () => {
    expect(canAccessAutomationAccount(singleWorkspaceOwnerScope, [ACCOUNT_A], ACCOUNT_B)).toBe(false)
  })

  it('6. a member cannot access another connected account\'s run logs (same check, same function)', () => {
    expect(canAccessAutomationAccount(singleWorkspaceOwnerScope, [ACCOUNT_A], ACCOUNT_B)).toBe(false)
  })

  it('14/15. a NULL (pre-migration legacy) row is only accessible via the narrow transitional fallback, never by matching it against an arbitrary accountIds list', () => {
    // accountIds deliberately does NOT contain null — the null branch is
    // handled entirely by canAccessLegacyUnmigratedAutomationData, not by
    // accountIds.includes(), so this proves there's no accidental
    // "null happens to satisfy .includes()" bug.
    expect(canAccessAutomationAccount(singleWorkspaceOwnerScope, [ACCOUNT_A], null)).toBe(true) // exactly one writable workspace — the one legitimate transitional case
    expect(canAccessAutomationAccount(noMembershipScope, [], null)).toBe(false) // no membership at all — never falls back
  })

  it('a caller with zero accessible accounts cannot access a real connected account', () => {
    expect(canAccessAutomationAccount(noMembershipScope, [], ACCOUNT_A)).toBe(false)
  })
})
