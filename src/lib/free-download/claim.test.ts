import { describe, expect, it } from 'vitest'
import {
  getDuplicateClaimCutoff,
  normalizeEmail,
  normalizeFirstName,
  validateFreeClaimInput,
} from './claim'

describe('free-product claim validation', () => {
  it('normalizes a valid name and email', () => {
    expect(
      validateFreeClaimInput({
        firstName: '  Ana   Maria  ',
        email: '  ANA@Example.COM ',
      })
    ).toEqual({
      value: { firstName: 'Ana Maria', email: 'ana@example.com' },
      fieldErrors: {},
    })
  })

  it('reports missing and invalid values by field', () => {
    expect(validateFreeClaimInput({ firstName: '', email: 'not-an-email' })).toEqual({
      fieldErrors: {
        firstName: 'Enter your first name.',
        email: 'Enter a valid email address.',
      },
    })
  })

  it('accepts international names and rejects names without letters', () => {
    expect(validateFreeClaimInput({ firstName: 'Élodie', email: 'e@example.com' }).fieldErrors).toEqual({})
    expect(validateFreeClaimInput({ firstName: '---', email: 'e@example.com' }).fieldErrors.firstName).toBe(
      'Enter a valid first name.'
    )
  })

  it('normalizes individual fields', () => {
    expect(normalizeFirstName('  Sam   Lee ')).toBe('Sam Lee')
    expect(normalizeEmail(' SAM@EXAMPLE.COM ')).toBe('sam@example.com')
  })

  it('creates the cutoff for the duplicate-delivery window', () => {
    expect(getDuplicateClaimCutoff(new Date('2026-08-15T12:00:00.000Z'))).toBe(
      '2026-08-15T11:50:00.000Z'
    )
  })
})
