import { describe, expect, it } from 'vitest'
import {
  DEFAULT_THEME,
  getContrastRatio,
  hexToRgba,
  isValidHexColor,
  parseThemeConfigInput,
  PRESET_THEMES,
  resolveWaitlistTheme,
} from './theme'

describe('isValidHexColor', () => {
  it('accepts 3 and 6 digit hex colors', () => {
    expect(isValidHexColor('#FFF')).toBe(true)
    expect(isValidHexColor('#F6F3EA')).toBe(true)
  })

  it('rejects malformed values', () => {
    expect(isValidHexColor('FFF')).toBe(false)
    expect(isValidHexColor('#GGGGGG')).toBe(false)
    expect(isValidHexColor('red')).toBe(false)
    expect(isValidHexColor(undefined)).toBe(false)
  })
})

describe('resolveWaitlistTheme', () => {
  it('falls back to the default theme for missing or malformed config', () => {
    expect(resolveWaitlistTheme(null)).toEqual(DEFAULT_THEME)
    expect(resolveWaitlistTheme(undefined)).toEqual(DEFAULT_THEME)
    expect(resolveWaitlistTheme('nonsense')).toEqual(DEFAULT_THEME)
    expect(resolveWaitlistTheme({ preset: 'not-a-real-preset' })).toEqual(DEFAULT_THEME)
  })

  it('resolves a built-in preset from its name alone', () => {
    expect(resolveWaitlistTheme({ preset: 'warm-paper' })).toEqual(PRESET_THEMES['warm-paper'])
  })

  it('resolves the slowday preset', () => {
    expect(resolveWaitlistTheme({ preset: 'slowday' })).toEqual(PRESET_THEMES.slowday)
  })

  it('ignores stray color fields on a non-custom preset', () => {
    expect(resolveWaitlistTheme({ preset: 'monochrome', background: '#FF00FF' })).toEqual(
      PRESET_THEMES.monochrome
    )
  })

  it('resolves valid custom colors as-is', () => {
    const theme = resolveWaitlistTheme({
      preset: 'custom',
      background: '#f6f3ea',
      text: '#111111',
      secondaryText: '#666666',
      accent: '#111111',
      accentText: '#ffffff',
      border: '#d8d2c6',
    })
    expect(theme).toEqual({
      background: '#F6F3EA',
      surface: '#F6F3EA',
      text: '#111111',
      secondaryText: '#666666',
      accent: '#111111',
      accentText: '#FFFFFF',
      border: '#D8D2C6',
    })
  })

  it('falls back per-field for invalid custom colors instead of breaking', () => {
    const theme = resolveWaitlistTheme({
      preset: 'custom',
      background: '#F6F3EA',
      text: 'not-a-color',
      secondaryText: '#666666',
      accent: '#111111',
      accentText: '#FFFFFF',
      border: '#D8D2C6',
    })
    expect(theme.text).toBe(DEFAULT_THEME.text)
    expect(theme.background).toBe('#F6F3EA')
  })

  it('never renders identical text and background, even if saved that way', () => {
    const theme = resolveWaitlistTheme({
      preset: 'custom',
      background: '#111111',
      text: '#111111',
      secondaryText: '#666666',
      accent: '#222222',
      accentText: '#FFFFFF',
      border: '#333333',
    })
    expect(theme.text).not.toBe(theme.background)
  })

  it('never renders identical accent and accentText', () => {
    const theme = resolveWaitlistTheme({
      preset: 'custom',
      background: '#FFFFFF',
      text: '#111111',
      secondaryText: '#666666',
      accent: '#111111',
      accentText: '#111111',
      border: '#DDDDDD',
    })
    expect(theme.accentText).not.toBe(theme.accent)
  })
})

describe('parseThemeConfigInput', () => {
  it('defaults to the not4normal-dark preset when omitted', () => {
    expect(parseThemeConfigInput(undefined)).toEqual({ value: { preset: 'not4normal-dark' } })
  })

  it('rejects an unknown preset', () => {
    expect(parseThemeConfigInput({ preset: 'neon' }).error).toBeTruthy()
  })

  it('stores only the preset name for a built-in preset, dropping stray colors', () => {
    expect(parseThemeConfigInput({ preset: 'minimal-white', background: '#FF00FF' })).toEqual({
      value: { preset: 'minimal-white' },
    })
  })

  it('accepts the slowday preset', () => {
    expect(parseThemeConfigInput({ preset: 'slowday' })).toEqual({ value: { preset: 'slowday' } })
  })

  it('accepts a fully specified custom theme', () => {
    const result = parseThemeConfigInput({
      preset: 'custom',
      background: '#f6f3ea',
      text: '#111111',
      secondaryText: '#666666',
      accent: '#111111',
      accentText: '#ffffff',
      border: '#d8d2c6',
    })
    expect(result.error).toBeUndefined()
    expect(result.value?.preset).toBe('custom')
    expect(result.value?.background).toBe('#F6F3EA')
    expect(result.value?.surface).toBeUndefined()
  })

  it('rejects a custom theme missing a required color', () => {
    expect(
      parseThemeConfigInput({
        preset: 'custom',
        background: '#F6F3EA',
        text: '#111111',
        accent: '#111111',
        accentText: '#FFFFFF',
        border: '#D8D2C6',
      }).error
    ).toBeTruthy()
  })

  it('rejects identical text and background', () => {
    expect(
      parseThemeConfigInput({
        preset: 'custom',
        background: '#111111',
        text: '#111111',
        secondaryText: '#666666',
        accent: '#222222',
        accentText: '#FFFFFF',
        border: '#333333',
      }).error
    ).toBe('Text and background colors cannot be the same')
  })

  it('rejects identical accent and accentText', () => {
    expect(
      parseThemeConfigInput({
        preset: 'custom',
        background: '#FFFFFF',
        text: '#111111',
        secondaryText: '#666666',
        accent: '#111111',
        accentText: '#111111',
        border: '#DDDDDD',
      }).error
    ).toBe('Button text and button color cannot be the same')
  })
})

describe('getContrastRatio', () => {
  it('returns the maximum ratio for black on white', () => {
    expect(getContrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0)
  })

  it('returns 1 for identical colors', () => {
    expect(getContrastRatio('#111111', '#111111')).toBeCloseTo(1, 5)
  })
})

describe('hexToRgba', () => {
  it('converts a hex color to an rgba string at the given alpha', () => {
    expect(hexToRgba('#FFFFFF', 0.7)).toBe('rgba(255, 255, 255, 0.7)')
    expect(hexToRgba('#000000', 0.5)).toBe('rgba(0, 0, 0, 0.5)')
  })

  it('falls back to the default surface color for invalid input', () => {
    expect(hexToRgba('not-a-color', 0.5)).toBe(hexToRgba(DEFAULT_THEME.surface, 0.5))
  })
})
