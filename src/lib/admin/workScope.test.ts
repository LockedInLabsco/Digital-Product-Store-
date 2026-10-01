import { describe, expect, it, vi } from 'vitest'

// workScope.ts (and auth.ts, which it imports) both `import 'server-only'`
// at module scope — that package throws unconditionally outside Next's
// RSC build, so it must be stubbed before the module graph loads. Same
// reason src/lib/admin/teamGuards.ts and auth.ts have no existing unit
// tests in this codebase; here we only need the PURE functions, so a
// stub (not a real supabase mock) is enough to let the module load.
vi.mock('server-only', () => ({}))
// Only the pure, synchronous functions below are under test — nothing
// here calls supabaseServer — so a stub is enough to let the module
// graph load without needing real Supabase env vars (createClient()
// throws on an empty URL, which vitest has none of).
vi.mock('@/src/lib/supabase/server', () => ({ supabaseServer: {} }))
// React's cache() is a Next.js/RSC-bundler export condition that vitest's
// plain 'react' resolution doesn't provide — auth.ts/workScope.ts both
// call it at module scope (getCurrentAdmin/getWorkScope), so it needs a
// passthrough stub here purely to let those modules finish loading;
// nothing in this file calls the cached functions themselves.
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>()
  return { ...actual, cache: <T>(fn: T) => fn }
})

import {
  canReadTask,
  canEditTask,
  canEditTaskField,
  canDeleteTask,
  canAssignTaskToUser,
  canManageTeam,
  canReadTeam,
  canCreateTeam,
  type WorkScope,
  type TaskScopeInput,
} from './workScope'

const ownerScope: WorkScope = {
  adminUserId: 'owner-1',
  seesAll: true,
  managesAllTeams: true,
  leadsTeamIds: [],
  memberTeamIds: [],
}

const leadAScope: WorkScope = {
  adminUserId: 'lead-a',
  seesAll: false,
  managesAllTeams: false,
  leadsTeamIds: ['team-a'],
  memberTeamIds: ['team-a'],
}

// A plain (non-lead) member of team-a.
const memberScope: WorkScope = {
  adminUserId: 'member-1',
  seesAll: false,
  managesAllTeams: false,
  leadsTeamIds: [],
  memberTeamIds: ['team-a'],
}

// Belongs to no team at all.
const unrelatedScope: WorkScope = {
  adminUserId: 'member-2',
  seesAll: false,
  managesAllTeams: false,
  leadsTeamIds: [],
  memberTeamIds: [],
}

const teamATask: TaskScopeInput = { assigneeId: 'member-1', createdBy: 'lead-a', teamId: 'team-a' }
const teamBTask: TaskScopeInput = { assigneeId: 'someone-else', createdBy: 'lead-b', teamId: 'team-b' }
const member1OwnTask: TaskScopeInput = { assigneeId: 'member-1', createdBy: 'member-1', teamId: null }
const unrelatedPersonalTask: TaskScopeInput = { assigneeId: 'member-2', createdBy: 'member-2', teamId: null }

describe('canReadTask', () => {
  it('1. owner sees everything', () => {
    expect(canReadTask(ownerScope, teamBTask)).toBe(true)
    expect(canReadTask(ownerScope, unrelatedPersonalTask)).toBe(true)
  })

  it('2. a lead of Team A can see Team A tasks', () => {
    expect(canReadTask(leadAScope, teamATask)).toBe(true)
  })

  it('3. a lead of Team A cannot see Team B tasks', () => {
    expect(canReadTask(leadAScope, teamBTask)).toBe(false)
  })

  it('4. a member can see their own task', () => {
    expect(canReadTask(memberScope, member1OwnTask)).toBe(true)
  })

  it('5. a member cannot see another member\'s unrelated task', () => {
    expect(canReadTask(memberScope, unrelatedPersonalTask)).toBe(false)
  })
})

describe('canEditTask / canEditTaskField', () => {
  it('a task\'s own assignee (not its creator) may only change status/blocked_reason', () => {
    // member-1 is the assignee of teamATask but did NOT create it (lead-a did).
    expect(canEditTask(memberScope, teamATask)).toBe(true)
    expect(canEditTaskField(memberScope, teamATask, 'status')).toBe(true)
    expect(canEditTaskField(memberScope, teamATask, 'blocked_reason')).toBe(true)
    expect(canEditTaskField(memberScope, teamATask, 'title')).toBe(false)
    expect(canEditTaskField(memberScope, teamATask, 'priority')).toBe(false)
  })

  it('a task\'s creator has full field rights on their own task', () => {
    expect(canEditTaskField(memberScope, member1OwnTask, 'title')).toBe(true)
    expect(canEditTaskField(memberScope, member1OwnTask, 'priority')).toBe(true)
  })

  it('a lead has full field rights within a team they lead', () => {
    expect(canEditTaskField(leadAScope, teamATask, 'title')).toBe(true)
    expect(canEditTaskField(leadAScope, teamATask, 'priority')).toBe(true)
  })

  it('an unrelated admin cannot edit any field', () => {
    expect(canEditTask(unrelatedScope, teamATask)).toBe(false)
    expect(canEditTaskField(unrelatedScope, teamATask, 'status')).toBe(false)
  })
})

describe('canDeleteTask', () => {
  it('a plain assignee (not the creator) cannot delete the task', () => {
    expect(canDeleteTask(memberScope, teamATask)).toBe(false)
  })

  it('a member may delete their own purely personal task', () => {
    expect(canDeleteTask(memberScope, member1OwnTask)).toBe(true)
  })

  it('a lead may delete any task within a team they lead', () => {
    expect(canDeleteTask(leadAScope, teamATask)).toBe(true)
  })

  it('owner may delete anything', () => {
    expect(canDeleteTask(ownerScope, teamBTask)).toBe(true)
  })
})

describe('canAssignTaskToUser', () => {
  it('6. a plain member cannot assign a task to someone else', () => {
    expect(canAssignTaskToUser(memberScope, 'someone-else', 'team-a')).toBe(false)
  })

  it('7. a lead can assign to a member of their led team', () => {
    expect(canAssignTaskToUser(leadAScope, 'member-1', 'team-a')).toBe(true)
  })

  it('8. a lead cannot assign into a team they do not lead', () => {
    expect(canAssignTaskToUser(leadAScope, 'someone-else', 'team-b')).toBe(false)
  })

  it('anyone may "assign" a task to themself', () => {
    expect(canAssignTaskToUser(memberScope, 'member-1', null)).toBe(true)
  })

  it('owner/manage_all can assign anywhere, even with no team context', () => {
    expect(canAssignTaskToUser(ownerScope, 'anyone', null)).toBe(true)
  })
})

describe('canManageTeam / canReadTeam / canCreateTeam', () => {
  it('12. a lead can manage the team they lead but not an unrelated team', () => {
    expect(canManageTeam(leadAScope, 'team-a')).toBe(true)
    expect(canManageTeam(leadAScope, 'team-b')).toBe(false)
  })

  it('a plain member cannot manage even their own team', () => {
    expect(canManageTeam(memberScope, 'team-a')).toBe(false)
  })

  it('a plain member can still read a team they belong to', () => {
    expect(canReadTeam(memberScope, 'team-a')).toBe(true)
    expect(canReadTeam(memberScope, 'team-b')).toBe(false)
  })

  it('team creation is restricted to managesAllTeams, never lead-delegable', () => {
    expect(canCreateTeam(ownerScope)).toBe(true)
    expect(canCreateTeam(leadAScope)).toBe(false)
    expect(canCreateTeam(memberScope)).toBe(false)
  })
})
