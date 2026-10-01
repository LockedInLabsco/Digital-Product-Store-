import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const mocks = vi.hoisted(() => ({
  insertedRows: [] as Record<string, unknown>[],
  insertError: null as { message: string } | null,
}))

vi.mock('@/src/lib/supabase/server', () => ({
  supabaseServer: {
    from: vi.fn(() => ({
      insert: vi.fn(async (row: Record<string, unknown>) => {
        mocks.insertedRows.push(row)
        return { error: mocks.insertError }
      }),
    })),
  },
}))

import { logWorkActivity } from './activityLog'

describe('logWorkActivity', () => {
  beforeEach(() => {
    mocks.insertedRows = []
    mocks.insertError = null
  })

  it('11. writes an activity row with the actor, action, entity, and metadata', async () => {
    await logWorkActivity({
      actorAdminUserId: 'admin-1',
      action: 'task_status_changed',
      entityType: 'task',
      entityId: 'task-1',
      metadata: { status: { from: 'in_progress', to: 'completed' } },
    })

    expect(mocks.insertedRows).toEqual([
      {
        actor_admin_user_id: 'admin-1',
        action: 'task_status_changed',
        entity_type: 'task',
        entity_id: 'task-1',
        metadata: { status: { from: 'in_progress', to: 'completed' } },
      },
    ])
  })

  it('defaults entity_id to null and metadata to {} when omitted', async () => {
    await logWorkActivity({ actorAdminUserId: 'admin-1', action: 'team_created', entityType: 'team' })
    expect(mocks.insertedRows[0]).toMatchObject({ entity_id: null, metadata: {} })
  })

  it('never throws if the insert fails — a logging failure must not roll back the mutation it describes', async () => {
    mocks.insertError = { message: 'db unavailable' }
    await expect(
      logWorkActivity({ actorAdminUserId: 'admin-1', action: 'task_deleted', entityType: 'task', entityId: 'task-1' })
    ).resolves.toBeUndefined()
  })
})
