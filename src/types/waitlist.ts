export type WaitlistStatus = 'draft' | 'active' | 'closed'

export type WaitlistThemePreset =
  | 'not4normal-dark'
  | 'minimal-white'
  | 'monochrome'
  | 'warm-paper'
  | 'slowday'
  | 'custom'

export type WaitlistLayout = 'standard' | 'standalone'

/**
 * Colors are only ever populated when preset is 'custom' — a built-in
 * preset is resolved from PRESET_THEMES (see lib/waitlist/theme.ts) at
 * render time, not duplicated into every waitlist row. surface is the
 * one optional color (falls back to background when absent).
 *
 * `layout` is a separate, independent concern from color: 'standalone'
 * swaps the public page from the generic NOT4NORMAL-chrome layout to a
 * dedicated, self-contained landing-page presentation (own header/hero/
 * sections/footer — see components/waitlist/StandaloneWaitlistPage).
 * Omitted/absent means 'standard', so every existing waitlist row keeps
 * rendering exactly as it already does.
 */
export interface WaitlistThemeConfig {
  preset: WaitlistThemePreset
  background?: string
  text?: string
  secondaryText?: string
  accent?: string
  accentText?: string
  surface?: string
  border?: string
  layout?: WaitlistLayout
}

/**
 * Admin-uploaded screenshot URLs for the standalone SlowDay waitlist.
 * Not currently rendered on the public page (the standalone layout is a
 * simple two-card form/description pairing — see
 * components/waitlist/SlowdayHero.tsx) but the admin upload UI and this
 * data still exist for any future use. Any key can be absent. Unused
 * (but harmless) for a waitlist not on the standalone layout.
 */
export interface WaitlistScreenshots {
  home?: string
  focus?: string
  slowday?: string
  progress?: string
}

export interface Waitlist {
  id: string
  name: string
  slug: string
  description: string | null
  headline: string | null
  supporting_text: string | null
  button_text: string | null
  status: WaitlistStatus
  theme_config: WaitlistThemeConfig
  screenshots: WaitlistScreenshots
  created_at: string
  updated_at: string
}

export interface WaitlistWithCount extends Waitlist {
  entry_count: number
}

export interface WaitlistEntry {
  id: string
  waitlist_id: string
  email: string
  instagram_username: string | null
  first_name: string | null
  source: string
  created_at: string
}
