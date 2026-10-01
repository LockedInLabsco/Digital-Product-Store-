import { describe, expect, it } from 'vitest'
import { validateBlockedReasonRule, deriveCompletedAt, validateTaskCreateInput, validateTaskPatchInput } from './validate'

describe('validateBlockedReasonRule', () => {
  it('requires a blocked_reason when status is blocked', () => {
    expect(validateBlockedReasonRule('blocked', null)).toBe('A blocked task requires a blocked_reason')
    expect(validateBlockedReasonRule('blocked', '')).toBe('A blocked task requires a blocked_reason')
  })

  it('passes when status is blocked and a reason is present', () => {
    expect(validateBlockedReasonRule('blocked', 'Waiting on design')).toBeNull()
  })

  it('does not require a reason for non-blocked statuses', () => {
    expect(validateBlockedReasonRule('not_started', null)).toBeNull()
    expect(validateBlockedReasonRule('in_progress', null)).toBeNull()
    expect(validateBlockedReasonRule('completed', null)).toBeNull()
  })
})

describe('deriveCompletedAt — completed_at is controlled server-side, never by the client', () => {
  const NOW = '2026-01-15T10:00:00.000Z'

  it('sets completed_at when status transitions into completed', () => {
    expect(deriveCompletedAt('in_progress', 'completed', NOW)).toBe(NOW)
  })

  it('clears completed_at when a completed task is reopened', () => {
    expect(deriveCompletedAt('completed', 'in_progress', NOW)).toBeNull()
    expect(deriveCompletedAt('completed', 'not_started', NOW)).toBeNull()
  })

  it('leaves completed_at untouched when status does not change', () => {
    expect(deriveCompletedAt('in_progress', undefined, NOW)).toBeUndefined()
    expect(deriveCompletedAt('completed', 'completed', NOW)).toBeUndefined()
  })

  it('leaves completed_at untouched for a transition between two non-completed statuses', () => {
    expect(deriveCompletedAt('not_started', 'in_progress', NOW)).toBeUndefined()
    expect(deriveCompletedAt('in_progress', 'blocked', NOW)).toBeUndefined()
  })
})

describe('validateTaskCreateInput', () => {
  it('requires a title', () => {
    expect(validateTaskCreateInput({}).error).toBe('Title is required')
    expect(validateTaskCreateInput({ title: '   ' }).error).toBe('Title is required')
  })

  it('rejects a blocked status with no reason at creation time', () => {
    const result = validateTaskCreateInput({ title: 'Ship it', status: 'blocked' })
    expect(result.error).toBe('A blocked task requires a blocked_reason')
  })

  it('defaults priority/status and accepts a minimal valid payload', () => {
    const result = validateTaskCreateInput({ title: 'Post the reel' })
    expect(result.error).toBeUndefined()
    expect(result.value).toMatchObject({ title: 'Post the reel', priority: 'normal', status: 'not_started' })
  })

  it('rejects a malformed assignee_id', () => {
    expect(validateTaskCreateInput({ title: 'x', assignee_id: 'not-a-uuid' }).error).toBe('Assignee is invalid')
  })
})

describe('validateTaskPatchInput', () => {
  it('only returns keys that were actually present in the body', () => {
    const result = validateTaskPatchInput({ status: 'in_progress' })
    expect(result.value).toEqual({ status: 'in_progress' })
  })

  it('rejects an empty title', () => {
    expect(validateTaskPatchInput({ title: '   ' }).error).toBe('Title cannot be empty')
  })

  it('rejects an invalid status value', () => {
    expect(validateTaskPatchInput({ status: 'done' }).error).toMatch(/Status must be one of/)
  })
})
