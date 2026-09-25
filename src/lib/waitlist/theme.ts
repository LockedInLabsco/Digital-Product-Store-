import type { WaitlistLayout, WaitlistThemeConfig, WaitlistThemePreset } from '@/src/types/waitlist'

export interface WaitlistThemeColors {
  background: string
  text: string
  secondaryText: string
  accent: string
  accentText: string
  surface: string
  border: string
}

const HEX_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

export function isValidHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_PATTERN.test(value.trim())
}

function normalizeHex(value: string): string {
  return value.trim().toUpperCase()
}

// The default preset — deliberately matches the site's existing dark
// navy / electric-blue identity (see globals.css) so a waitlist with no
// theme configured looks identical to how this page always looked.
// Colors with an alpha channel there (e.g. text-cream/65 over the page
// background) are pre-flattened to an equivalent solid hex here, since
// this system only ever stores solid colors.
const NOT4NORMAL_DARK: WaitlistThemeColors = {
  background: '#0E1738',
  surface: '#030615',
  text: '#FFFFFF',
  secondaryText: '#ABAEB9',
  accent: '#174CFF',
  accentText: '#FFFFFF',
  border: '#26366A',
}

const MINIMAL_WHITE: WaitlistThemeColors = {
  background: '#FFFFFF',
  surface: '#F5F5F3',
  text: '#111111',
  secondaryText: '#6B6B6B',
  accent: '#111111',
  accentText: '#FFFFFF',
  border: '#E2E2E2',
}

const MONOCHROME: WaitlistThemeColors = {
  background: '#000000',
  surface: '#141414',
  text: '#FFFFFF',
  secondaryText: '#A6A6A6',
  accent: '#FFFFFF',
  accentText: '#000000',
  border: '#333333',
}

const WARM_PAPER: WaitlistThemeColors = {
  background: '#F6F3EA',
  surface: '#EEEAE0',
  text: '#111111',
  secondaryText: '#6B6659',
  accent: '#111111',
  accentText: '#FFFFFF',
  border: '#D8D2C6',
}

// SlowDay's brand preset: crisp monochrome, calm, premium — soft
// off-white over near-black, deliberately cooler/crisper than
// warm-paper and MINIMAL_WHITE's pure white, so the product has its
// own distinct (if closely related) identity in the preset list.
const SLOWDAY: WaitlistThemeColors = {
  background: '#FAFAF9',
  surface: '#FFFFFF',
  text: '#121212',
  secondaryText: '#6B6B6F',
  accent: '#111111',
  accentText: '#FFFFFF',
  border: '#E4E4E2',
}

export const PRESET_THEMES: Record<Exclude<WaitlistThemePreset, 'custom'>, WaitlistThemeColors> = {
  'not4normal-dark': NOT4NORMAL_DARK,
  'minimal-white': MINIMAL_WHITE,
  monochrome: MONOCHROME,
  'warm-paper': WARM_PAPER,
  slowday: SLOWDAY,
}

export const PRESET_LABELS: Record<WaitlistThemePreset, string> = {
  'not4normal-dark': 'NOT4NORMAL Dark',
  'minimal-white': 'Minimal White',
  monochrome: 'Monochrome',
  'warm-paper': 'Warm Paper',
  slowday: 'SlowDay',
  custom: 'Custom',
}

export const DEFAULT_THEME = NOT4NORMAL_DARK
export const DEFAULT_THEME_CONFIG: WaitlistThemeConfig = { preset: 'not4normal-dark' }

const PRESET_VALUES: WaitlistThemePreset[] = [
  'not4normal-dark',
  'minimal-white',
  'monochrome',
  'warm-paper',
  'slowday',
  'custom',
]

/**
 * Turns a stored (or missing/malformed) theme_config into concrete
 * colors that are always safe to render — never returns an invalid or
 * unreadable combination, no matter what's in the database.
 */
export function resolveWaitlistTheme(config: unknown): WaitlistThemeColors {
  if (!config || typeof config !== 'object') return DEFAULT_THEME

  const preset = (config as { preset?: unknown }).preset
  if (typeof preset !== 'string' || !PRESET_VALUES.includes(preset as WaitlistThemePreset)) {
    return DEFAULT_THEME
  }

  if (preset !== 'custom') {
    return PRESET_THEMES[preset as Exclude<WaitlistThemePreset, 'custom'>]
  }

  const raw = config as Record<string, unknown>
  const field = (key: keyof WaitlistThemeColors) =>
    isValidHexColor(raw[key]) ? normalizeHex(raw[key] as string) : DEFAULT_THEME[key]

  const background = field('background')
  const surface = isValidHexColor(raw.surface) ? normalizeHex(raw.surface as string) : background
  let text = field('text')
  let accent = field('accent')
  let accentText = field('accentText')

  // Hard safety floor: never render text that's invisible against its
  // own background, no matter what was saved.
  if (text.toLowerCase() === background.toLowerCase()) {
    text = DEFAULT_THEME.text
  }
  if (accentText.toLowerCase() === accent.toLowerCase()) {
    accentText = DEFAULT_THEME.accentText
  }

  return {
    background,
    surface,
    text,
    secondaryText: field('secondaryText'),
    accent,
    accentText,
    border: field('border'),
  }
}

const LAYOUT_VALUES: WaitlistLayout[] = ['standard', 'standalone']

/**
 * Reads the layout flag straight off the raw stored config — deliberately
 * independent of resolveWaitlistTheme (which only ever returns colors),
 * so a page can decide its whole presentation before touching color
 * resolution at all. Missing/malformed data safely falls back to
 * 'standard', same "never breaks on bad data" contract as the rest of
 * this module.
 */
export function isStandaloneLayout(config: unknown): boolean {
  if (!config || typeof config !== 'object') return false
  const layout = (config as { layout?: unknown }).layout
  return layout === 'standalone'
}

export interface ThemeValidationResult {
  value?: WaitlistThemeConfig
  error?: string
}

/**
 * Validates admin-submitted theme input before it's saved. Built-in
 * presets are stored as just { preset } — no color duplication. Custom
 * themes require all colors except surface, must be valid hex, and
 * can't pair identical text/background or accent/accentText (the two
 * ways a theme can render literally unreadable).
 */
export function parseThemeConfigInput(input: unknown): ThemeValidationResult {
  if (input === undefined || input === null) {
    return { value: DEFAULT_THEME_CONFIG }
  }

  if (typeof input !== 'object') {
    return { error: 'Invalid theme data' }
  }

  const raw = input as Record<string, unknown>
  const preset = raw.preset

  if (typeof preset !== 'string' || !PRESET_VALUES.includes(preset as WaitlistThemePreset)) {
    return { error: 'Invalid theme preset' }
  }

  const layout: WaitlistLayout | undefined =
    typeof raw.layout === 'string' && LAYOUT_VALUES.includes(raw.layout as WaitlistLayout)
      ? (raw.layout as WaitlistLayout)
      : undefined

  if (preset !== 'custom') {
    return { value: { preset: preset as WaitlistThemePreset, ...(layout ? { layout } : {}) } }
  }

  const requiredFields: (keyof WaitlistThemeColors)[] = [
    'background',
    'text',
    'secondaryText',
    'accent',
    'accentText',
    'border',
  ]

  for (const key of requiredFields) {
    if (!isValidHexColor(raw[key])) {
      return { error: `Enter a valid hex color for ${key}` }
    }
  }

  const background = normalizeHex(raw.background as string)
  const text = normalizeHex(raw.text as string)
  const accent = normalizeHex(raw.accent as string)
  const accentText = normalizeHex(raw.accentText as string)

  if (text === background) {
    return { error: 'Text and background colors cannot be the same' }
  }
  if (accentText === accent) {
    return { error: 'Button text and button color cannot be the same' }
  }

  const surface = isValidHexColor(raw.surface) ? normalizeHex(raw.surface as string) : undefined

  return {
    value: {
      preset: 'custom',
      background,
      text,
      secondaryText: normalizeHex(raw.secondaryText as string),
      accent,
      accentText,
      border: normalizeHex(raw.border as string),
      ...(surface ? { surface } : {}),
      ...(layout ? { layout } : {}),
    },
  }
}

// --- Contrast helpers (admin-only UX warning, never blocks saving) ---

function hexToRgb(hex: string): [number, number, number] {
  let value = hex.replace('#', '')
  if (value.length === 3) {
    value = value
      .split('')
      .map((char) => char + char)
      .join('')
  }
  const num = parseInt(value, 16)
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255]
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  const channel = (c: number) => {
    const srgb = c / 255
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4)
  }
  const [rl, gl, bl] = [channel(r), channel(g), channel(b)]
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl
}

/**
 * Renders a theme color as a translucent rgba() string — used for the
 * optional frosted "panel" surface treatment (see PublicWaitlistForm's
 * `panel` prop), since the theme system only ever stores solid hex.
 */
export function hexToRgba(hex: string, alpha: number): string {
  const safeHex = isValidHexColor(hex) ? hex : DEFAULT_THEME.surface
  const [r, g, b] = hexToRgb(safeHex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export interface LiquidGlassStyle {
  backgroundColor: string
  backgroundImage: string
  borderColor: string
  boxShadow: string
}

/**
 * Shared "liquid glass" material recipe — dark, smoked glass (not a
 * white/frosted look): a mostly-black translucent surface with only a
 * faint corner glint and a barely-there top rim, just enough to read
 * as reflective glass without tinting the whole card white. Pair with
 * the `backdrop-blur-3xl` Tailwind class on the element for the actual
 * blur. Used by the SlowDay waitlist form panel + description card
 * (and their admin preview mockup) so all of them read as the same
 * physical material. `surfaceAlpha` controls how see-through it is.
 */
export function liquidGlassStyle(theme: WaitlistThemeColors, surfaceAlpha = 0.42): LiquidGlassStyle {
  return {
    backgroundColor: `rgba(0, 0, 0, ${surfaceAlpha})`,
    backgroundImage: 'radial-gradient(120% 120% at 15% -10%, rgba(255,255,255,0.06), rgba(255,255,255,0) 50%)',
    borderColor: hexToRgba(theme.text, 0.16),
    boxShadow:
      'inset 0 1px 0 rgba(255,255,255,0.1), 0 30px 80px -24px rgba(0,0,0,0.8), 0 10px 26px -14px rgba(0,0,0,0.65)',
  }
}

/** WCAG contrast ratio between two hex colors, from 1 (none) to 21 (max). */
export function getContrastRatio(hexA: string, hexB: string): number {
  if (!isValidHexColor(hexA) || !isValidHexColor(hexB)) return 21
  const lumA = relativeLuminance(hexToRgb(hexA))
  const lumB = relativeLuminance(hexToRgb(hexB))
  const lighter = Math.max(lumA, lumB)
  const darker = Math.min(lumA, lumB)
  return (lighter + 0.05) / (darker + 0.05)
}

// Lenient threshold — this is a heads-up, not a strict WCAG AA gate.
export const LOW_CONTRAST_THRESHOLD = 3
