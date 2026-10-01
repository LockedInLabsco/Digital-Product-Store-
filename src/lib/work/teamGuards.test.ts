import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  targetRow: null as { team_id: string; team_role: string } | null,
  otherLeadCount: 0,
}))

// Same chained-query-builder mock shape as
// src/app/api/download/free/[slug]/email/route.test.ts — every
// intermediate call (select/eq) returns the same object; the two
// terminal calls wouldRemoveLastTeamLead() actually awaits
// (maybeSingle() for the target row, neq() for the count) resolve from
// the `mocks` fixture set per test.
vi.mock('@/src/lib/supabase/server', () => ({
  supabaseServer: {
    from: vi.fn(() => {
      const query: Record<string, ReturnType<typeof vi.fn>> = {}
      query.select = vi.fn(() => query)
      query.eq = vi.fn(() => query)
      query.neq = vi.fn(async () => ({ count: mocks.otherLeadCount, data: null, error: null }))
      query.maybeSingle = vi.fn(async () => ({ data: mocks.targetRow, error: null }))
      return query
    }),
  },
}))

import { wouldRemoveLastTeamLead } from './teamGuards'

describe('wouldRemoveLastTeamLead', () => {
  beforeEach(() => {
    mocks.targetRow = null
    mocks.otherLeadCount = 0
  })

  it('returns false for a member row (not a lead) — nothing to protect', async () => {
    mocks.targetRow = { team_id: 'team-a', team_role: 'member' }
    expect(await wouldRemoveLastTeamLead('row-1')).toBe(false)
  })

  it('returns true when this is the team\'s only lead', async () => {
    mocks.targetRow = { team_id: 'team-a', team_role: 'lead' }
    mocks.otherLeadCount = 0
    expect(await wouldRemoveLastTeamLead('row-1')).toBe(true)
  })

  it('returns false when another lead remains on the team', async () => {
    mocks.targetRow = { team_id: 'team-a', team_role: 'lead' }
    mocks.otherLeadCount = 1
    expect(await wouldRemoveLastTeamLead('row-1')).toBe(false)
  })

  it('returns false if the member row does not exist', async () => {
    mocks.targetRow = null
    expect(await wouldRemoveLastTeamLead('missing-row')).toBe(false)
  })
})
