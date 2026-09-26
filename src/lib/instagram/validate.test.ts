import { describe, expect, it } from 'vitest'
import { validateAutomationFollowupInput, validateAutomationRuleInput } from './validate'

describe('validateAutomationRuleInput', () => {
  it('accepts a minimal valid comment_keyword rule', () => {
    const result = validateAutomationRuleInput({
      name: 'Send link',
      trigger_type: 'comment_keyword',
      keyword: 'link',
      reply_message: 'Here you go!',
    })
    expect(result.error).toBeUndefined()
    expect(result.value?.match_type).toBe('contains')
    expect(result.value?.is_active).toBe(true)
    expect(result.value?.keyword).toBe('link')
  })

  it('allows a null keyword (matches any text)', () => {
    const result = validateAutomationRuleInput({
      name: 'Reply to any story mention',
      trigger_type: 'story_reply',
      reply_message: 'Thanks for the shoutout!',
    })
    expect(result.error).toBeUndefined()
    expect(result.value?.keyword).toBeNull()
  })

  it('rejects a missing name', () => {
    const result = validateAutomationRuleInput({ trigger_type: 'comment_keyword', reply_message: 'hi' })
    expect(result.error).toMatch(/name/i)
  })

  it('rejects an invalid trigger_type', () => {
    const result = validateAutomationRuleInput({ name: 'x', trigger_type: 'story_like', reply_message: 'hi' })
    expect(result.error).toMatch(/trigger type/i)
  })

  it('rejects an invalid match_type', () => {
    const result = validateAutomationRuleInput({
      name: 'x',
      trigger_type: 'comment_keyword',
      match_type: 'fuzzy',
      reply_message: 'hi',
    })
    expect(result.error).toMatch(/match type/i)
  })

  it('rejects a missing reply_message', () => {
    const result = validateAutomationRuleInput({ name: 'x', trigger_type: 'comment_keyword' })
    expect(result.error).toMatch(/reply message/i)
  })

  it('respects is_active: false', () => {
    const result = validateAutomationRuleInput({
      name: 'x',
      trigger_type: 'dm_keyword',
      reply_message: 'hi',
      is_active: false,
    })
    expect(result.value?.is_active).toBe(false)
  })
})

describe('validateAutomationFollowupInput', () => {
  it('accepts a valid follow-up step', () => {
    const result = validateAutomationFollowupInput({ step_order: 1, delay_hours: 24, message: 'Just checking in!' })
    expect(result.error).toBeUndefined()
    expect(result.value).toEqual({ step_order: 1, delay_hours: 24, message: 'Just checking in!' })
  })

  it('rejects a non-positive step_order', () => {
    expect(validateAutomationFollowupInput({ step_order: 0, delay_hours: 1, message: 'hi' }).error).toMatch(/step order/i)
  })

  it('rejects a non-positive delay_hours', () => {
    expect(validateAutomationFollowupInput({ step_order: 1, delay_hours: 0, message: 'hi' }).error).toMatch(/delay/i)
  })

  it('rejects a missing message', () => {
    expect(validateAutomationFollowupInput({ step_order: 1, delay_hours: 1 }).error).toMatch(/message/i)
  })
})
