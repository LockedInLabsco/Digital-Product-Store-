import { describe, expect, it } from 'vitest'
import { normalizeInstagramUrl, urlsMatch } from './matching'

describe('normalizeInstagramUrl', () => {
  it('strips protocol, www, and trailing slash', () => {
    expect(normalizeInstagramUrl('https://www.instagram.com/reel/ABC123/')).toBe('instagram.com/reel/abc123')
    expect(normalizeInstagramUrl('https://instagram.com/reel/ABC123')).toBe('instagram.com/reel/abc123')
  })

  it('returns null for missing or invalid input', () => {
    expect(normalizeInstagramUrl(null)).toBeNull()
    expect(normalizeInstagramUrl(undefined)).toBeNull()
    expect(normalizeInstagramUrl('')).toBeNull()
    expect(normalizeInstagramUrl('not a url')).toBeNull()
  })
})

describe('urlsMatch', () => {
  it('matches equivalent URLs regardless of www/trailing slash/case', () => {
    expect(urlsMatch('https://www.instagram.com/reel/ABC123/', 'https://instagram.com/reel/abc123')).toBe(true)
  })

  it('does not match different posts', () => {
    expect(urlsMatch('https://instagram.com/reel/ABC123', 'https://instagram.com/reel/XYZ789')).toBe(false)
  })

  it('does not match when either side is missing', () => {
    expect(urlsMatch(null, 'https://instagram.com/reel/ABC123')).toBe(false)
    expect(urlsMatch('https://instagram.com/reel/ABC123', null)).toBe(false)
  })
})
