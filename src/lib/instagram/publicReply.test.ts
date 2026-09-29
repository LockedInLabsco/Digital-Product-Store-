import { describe, expect, it } from 'vitest'
import { pickPublicReplyVariationIndex } from './publicReply'

describe('pickPublicReplyVariationIndex', () => {
  it('always returns 0 when there is only one variation', () => {
    expect(pickPublicReplyVariationIndex(1, null)).toBe(0)
    expect(pickPublicReplyVariationIndex(1, 0)).toBe(0)
  })

  it('starts at 0 when nothing has been used yet', () => {
    expect(pickPublicReplyVariationIndex(3, null)).toBe(0)
  })

  it('round-robins through variations in order', () => {
    expect(pickPublicReplyVariationIndex(3, 0)).toBe(1)
    expect(pickPublicReplyVariationIndex(3, 1)).toBe(2)
    expect(pickPublicReplyVariationIndex(3, 2)).toBe(0)
  })

  it('never repeats the last-used index when there is more than one variation', () => {
    for (let last = 0; last < 3; last++) {
      expect(pickPublicReplyVariationIndex(3, last)).not.toBe(last)
    }
  })

  it('round-robins correctly with exactly 2 variations', () => {
    expect(pickPublicReplyVariationIndex(2, 0)).toBe(1)
    expect(pickPublicReplyVariationIndex(2, 1)).toBe(0)
  })
})
