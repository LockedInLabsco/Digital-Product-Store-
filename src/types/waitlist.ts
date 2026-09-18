export type WaitlistStatus = 'draft' | 'active' | 'closed'

export type WaitlistThemePreset =
  | 'not4normal-dark'
  | 'minimal-white'
  | 'monochrome'
  | 'warm-paper'
  | 'slowday'
  | 'custom'

/**
 * Colors are only ever populated when preset is 'custom' — a built-in
 * preset is resolved from PRESET_THEMES (see lib/waitlist/theme.ts) at
 * render time, not duplicated into every waitlist row. surface is the
 * one optional color (falls back to background when absent).
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
