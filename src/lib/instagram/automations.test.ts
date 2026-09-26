import { describe, expect, it } from 'vitest'
import { findMatchingRule } from './automations'
import type { IgAutomationRule } from '@/src/types/instagramAutomation'

function makeRule(overrides: Partial<IgAutomationRule>): IgAutomationRule {
  return {
    id: 'r1',
    name: 'Test rule',
    trigger_type: 'comment_keyword',
    keyword: 'link',
    match_type: 'contains',
    reply_message: 'Here you go!',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('findMatchingRule', () => {
  it('matches a contains keyword case-insensitively', () => {
    const rule = makeRule({ keyword: 'LINK' })
    expect(findMatchingRule([rule], 'comment_keyword', 'send me the Link please')).toEqual(rule)
  })

  it('does not match a contains keyword that is absent', () => {
    const rule = makeRule({ keyword: 'link' })
    expect(findMatchingRule([rule], 'comment_keyword', 'nice post!')).toBeNull()
  })

  it('requires an exact match for exact match_type', () => {
    const rule = makeRule({ keyword: 'link', match_type: 'exact' })
    expect(findMatchingRule([rule], 'comment_keyword', 'link')).toEqual(rule)
    expect(findMatchingRule([rule], 'comment_keyword', 'send me the link')).toBeNull()
  })

  it('a null keyword matches any text', () => {
    const rule = makeRule({ keyword: null, trigger_type: 'story_reply' })
    expect(findMatchingRule([rule], 'story_reply', 'anything at all')).toEqual(rule)
    expect(findMatchingRule([rule], 'story_reply', '')).toEqual(rule)
  })

  it('ignores inactive rules', () => {
    const rule = makeRule({ keyword: 'link', is_active: false })
    expect(findMatchingRule([rule], 'comment_keyword', 'link')).toBeNull()
  })

  it('ignores rules of a different trigger type', () => {
    const rule = makeRule({ keyword: 'link', trigger_type: 'dm_keyword' })
    expect(findMatchingRule([rule], 'comment_keyword', 'link')).toBeNull()
  })

  it('returns the first matching rule when several could match', () => {
    const first = makeRule({ id: 'first', keyword: 'link' })
    const second = makeRule({ id: 'second', keyword: 'link' })
    expect(findMatchingRule([first, second], 'comment_keyword', 'link')?.id).toBe('first')
  })
})
