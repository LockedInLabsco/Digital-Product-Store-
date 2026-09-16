import { describe, expect, it } from 'vitest'
import {
  normalizeEmail,
  normalizeInstagramUsername,
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
