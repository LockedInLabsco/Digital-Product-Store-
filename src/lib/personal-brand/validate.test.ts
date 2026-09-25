import { describe, expect, it } from 'vitest'
import {
  validateContentItemInput,
  validateContentMetricInput,
  validateExperimentInput,
  validateFormatInput,
  validateIdeaInput,
} from './validate'

describe('validateContentItemInput', () => {
  it('accepts a minimal valid item', () => {
    const result = validateContentItemInput({ content_type: 'reel' })
    expect(result.error).toBeUndefined()
    expect(result.value?.platform).toBe('instagram')
    expect(result.value?.content_type).toBe('reel')
    expect(result.value?.status).toBe('draft')
    expect(result.value?.tags).toEqual([])
  })

  it('rejects a missing content_type', () => {
    const result = validateContentItemInput({})
    expect(result.error).toMatch(/content type/i)
  })

  it('rejects an invalid platform', () => {
    const result = validateContentItemInput({ content_type: 'reel', platform: 'facebook' })
    expect(result.error).toMatch(/platform/i)
  })

  it('rejects an invalid status', () => {
    const result = validateContentItemInput({ content_type: 'reel', status: 'live' })
    expect(result.error).toMatch(/status/i)
  })

  it('normalizes and de-duplicates tags', () => {
    const result = validateContentItemInput({ content_type: 'reel', tags: ['Discipline', 'discipline', ' Habits '] })
    expect(result.value?.tags).toEqual(['discipline', 'habits'])
  })

  it('rejects a negative duration', () => {
    const result = validateContentItemInput({ content_type: 'reel', duration_seconds: -5 })
    expect(result.error).toMatch(/duration/i)
  })

  it('rejects an invalid posted_at date', () => {
    const result = validateContentItemInput({ content_type: 'reel', posted_at: 'not-a-date' })
    expect(result.error).toMatch(/date/i)
  })
})

describe('validateContentMetricInput', () => {
  it('accepts an empty snapshot (all fields optional except recorded_at, which defaults)', () => {
    const result = validateContentMetricInput({})
    expect(result.error).toBeUndefined()
    expect(result.value?.views).toBeNull()
    expect(typeof result.value?.recorded_at).toBe('string')
  })

  it('rejects a negative metric value', () => {
    const result = validateContentMetricInput({ views: -100 })
    expect(result.error).toMatch(/views/i)
  })

  it('rejects a completion_rate outside 0..1', () => {
    expect(validateContentMetricInput({ completion_rate: 1.5 }).error).toMatch(/completion rate/i)
    expect(validateContentMetricInput({ completion_rate: -0.1 }).error).toMatch(/completion rate/i)
  })

  it('accepts a full snapshot', () => {
    const result = validateContentMetricInput({
      views: 1000,
      likes: 100,
      comments: 10,
      shares: 5,
      saves: 20,
      followers_gained: 3,
      dms_generated: 1,
      completion_rate: 0.65,
    })
    expect(result.error).toBeUndefined()
    expect(result.value?.views).toBe(1000)
    expect(result.value?.completion_rate).toBe(0.65)
  })
})

describe('validateFormatInput', () => {
  it('requires a name', () => {
    expect(validateFormatInput({}).error).toMatch(/name/i)
  })

  it('accepts a minimal valid format', () => {
    const result = validateFormatInput({ name: 'Direct Promise -> Value -> CTA' })
    expect(result.error).toBeUndefined()
    expect(result.value?.status).toBe('active')
  })

  it('defaults an invalid status to active rather than erroring', () => {
    const result = validateFormatInput({ name: 'Test format', status: 'bogus' })
    expect(result.value?.status).toBe('active')
  })
})

describe('validateIdeaInput', () => {
  it('requires a title', () => {
    expect(validateIdeaInput({}).error).toMatch(/title/i)
  })

  it('defaults priority and status when omitted', () => {
    const result = validateIdeaInput({ title: 'Talk about phone addiction' })
    expect(result.error).toBeUndefined()
    expect(result.value?.priority).toBe('normal')
    expect(result.value?.status).toBe('idea')
  })

  it('defaults an invalid priority/status rather than erroring', () => {
    const result = validateIdeaInput({ title: 'Test', priority: 'urgent', status: 'bogus' })
    expect(result.value?.priority).toBe('normal')
    expect(result.value?.status).toBe('idea')
  })

  it('accepts valid priority and status values', () => {
    const result = validateIdeaInput({ title: 'Test', priority: 'high', status: 'planned' })
    expect(result.value?.priority).toBe('high')
    expect(result.value?.status).toBe('planned')
  })
})

describe('validateExperimentInput', () => {
  it('requires a name', () => {
    expect(validateExperimentInput({}).error).toMatch(/name/i)
  })

  it('defaults status to planned when omitted', () => {
    const result = validateExperimentInput({ name: 'Test hook length experiment' })
    expect(result.error).toBeUndefined()
    expect(result.value?.status).toBe('planned')
  })

  it('rejects an invalid started_at date', () => {
    const result = validateExperimentInput({ name: 'Test', started_at: 'not-a-date' })
    expect(result.error).toMatch(/started at/i)
  })

  it('accepts a fully filled experiment', () => {
    const result = validateExperimentInput({
      name: 'Shorter hooks',
      hypothesis: 'Hooks under 3 seconds retain more viewers',
      variable_tested: 'hook length',
      status: 'active',
    })
    expect(result.error).toBeUndefined()
    expect(result.value?.status).toBe('active')
  })
})
