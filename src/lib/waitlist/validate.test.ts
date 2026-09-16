import { describe, expect, it } from 'vitest'
import {
  isValidWaitlistSlug,
  normalizeEmail,
  normalizeInstagramUsername,
  normalizeSource,
  slugifyWaitlistName,
  validateWaitlistInput,
} from './validate'

describe('waitlist validation', () => {
  it('normalizes a valid submission', () => {
    expect(
      validateWaitlistInput({
        email: '  ANA@Example.COM ',
        instagramUsername: ' @ana.builds ',
        firstName: '  Ana  ',
      })
    ).toEqual({
      value: { email: 'ana@example.com', instagramUsername: 'ana.builds', firstName: 'Ana' },
      fieldErrors: {},
    })
  })

  it('allows an omitted first name', () => {
    expect(
      validateWaitlistInput({ email: 'ana@example.com', instagramUsername: 'ana' }).fieldErrors
    ).toEqual({})
  })

  it('strips a leading @ without requiring one', () => {
    expect(normalizeInstagramUsername('@ana.builds')).toBe('ana.builds')
    expect(normalizeInstagramUsername('ana.builds')).toBe('ana.builds')
  })

  it('reports missing and invalid values by field', () => {
    expect(validateWaitlistInput({ email: 'not-an-email', instagramUsername: '' }).fieldErrors).toEqual({
      email: 'Enter a valid email address.',
      instagramUsername: 'Enter your Instagram username.',
    })
  })

  it('rejects an instagram username with invalid characters', () => {
    expect(
      validateWaitlistInput({ email: 'ana@example.com', instagramUsername: 'ana builds!' }).fieldErrors
        .instagramUsername
    ).toBe('Enter a valid Instagram username.')
  })

  it('normalizes email casing and whitespace', () => {
    expect(normalizeEmail(' SAM@EXAMPLE.COM ')).toBe('sam@example.com')
  })
})

describe('waitlist slug helpers', () => {
  it('slugifies a name into a url-safe, hyphenated slug', () => {
    expect(slugifyWaitlistName('Phone Control App')).toBe('phone-control-app')
    expect(slugifyWaitlistName('  New Productivity App!! ')).toBe('new-productivity-app')
    expect(slugifyWaitlistName('Über Cool---Thing')).toBe('ber-cool-thing')
  })

  it('validates slug format', () => {
    expect(isValidWaitlistSlug('phone-control-app')).toBe(true)
    expect(isValidWaitlistSlug('Phone-Control')).toBe(false)
    expect(isValidWaitlistSlug('phone_control')).toBe(false)
    expect(isValidWaitlistSlug('-phone-control')).toBe(false)
  })
})

describe('normalizeSource', () => {
  it('accepts a safe source value', () => {
    expect(normalizeSource('instagram', 'waitlist_page')).toBe('instagram')
  })

  it('falls back for missing or unsafe values', () => {
    expect(normalizeSource(undefined, 'waitlist_page')).toBe('waitlist_page')
    expect(normalizeSource('has spaces', 'waitlist_page')).toBe('waitlist_page')
    expect(normalizeSource('<script>', 'waitlist_page')).toBe('waitlist_page')
  })
})
