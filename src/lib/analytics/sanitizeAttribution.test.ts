import { describe, expect, it } from 'vitest'
import { sanitizeAttribution, sanitizeDeviceCategory } from './sanitizeAttribution'

describe('sanitizeAttribution', () => {
  it('passes through known, well-typed string fields', () => {
    const result = sanitizeAttribution({
      first_touch_source: 'instagram',
      first_touch_medium: 'social',
      last_touch_campaign: 'test_campaign',
    })
    expect(result).toEqual({
      first_touch_source: 'instagram',
      first_touch_medium: 'social',
      last_touch_campaign: 'test_campaign',
    })
  })

  it('drops unknown keys — never lets arbitrary client data through', () => {
    const result = sanitizeAttribution({
      first_touch_source: 'instagram',
      __proto__: 'polluted',
      admin_password: 'hunter2',
      random_field: 'x',
    })
    expect(result).toEqual({ first_touch_source: 'instagram' })
  })

  it('drops non-string values for known keys', () => {
    const result = sanitizeAttribution({
      first_touch_source: 12345,
      first_touch_medium: { nested: true },
      first_touch_campaign: null,
    })
    expect(result).toEqual({})
  })

  it('drops overly long strings', () => {
    const result = sanitizeAttribution({ first_touch_source: 'x'.repeat(1000) })
    expect(result).toEqual({})
  })

  it('handles non-object input safely', () => {
    expect(sanitizeAttribution(null)).toEqual({})
    expect(sanitizeAttribution(undefined)).toEqual({})
    expect(sanitizeAttribution('a string')).toEqual({})
    expect(sanitizeAttribution(['array'])).toEqual({})
    expect(sanitizeAttribution(42)).toEqual({})
  })
})

describe('sanitizeDeviceCategory', () => {
  it('accepts only the three known categories', () => {
    expect(sanitizeDeviceCategory('mobile')).toBe('mobile')
    expect(sanitizeDeviceCategory('tablet')).toBe('tablet')
    expect(sanitizeDeviceCategory('desktop')).toBe('desktop')
  })

  it('rejects anything else', () => {
    expect(sanitizeDeviceCategory('smartwatch')).toBeNull()
    expect(sanitizeDeviceCategory('')).toBeNull()
    expect(sanitizeDeviceCategory(undefined)).toBeNull()
    expect(sanitizeDeviceCategory(123)).toBeNull()
  })
})
