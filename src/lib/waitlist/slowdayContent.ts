import type { WaitlistScreenshots } from '@/src/types/waitlist'

/**
 * SlowDay-specific presentation used by the dedicated /waitlist/[slug]
 * page (the headline/supporting text/button copy itself lives on the
 * waitlist's own database row and is editable from the admin).
 *
 * SLOWDAY_EYEBROW/SLOWDAY_FEATURES back the *generic* themed layout
 * (theme_config.layout === 'standard', or unset) — kept so the page
 * still renders sensibly if the standalone layout flag is ever missing
 * or turned off. Everything below STANDALONE_* only feeds the dedicated
 * standalone components (components/waitlist/Standalone*).
 */

export const SLOWDAY_WAITLIST_SLUG = 'slowday'

export const SLOWDAY_EYEBROW = 'SlowDay'

export const SLOWDAY_FEATURES = [
  'Screen time insights',
  'App blocking',
  'Grayscale controls',
  'Focus sessions',
  'Reward-based access',
]

// --- Standalone landing page copy ---------------------------------------

export const SLOWDAY_DEFAULT_SUPPORTING_TEXT =
  'For people who are tired of mindless scrolling, constant checking, and letting their phone take more than it gives.'

export const SLOWDAY_HERO_SUPPORTING_NOTE = 'Get early access when SlowDay launches.'

/** "Who SlowDay is for" — described as people, not personas or feature checkboxes. */
export const SLOWDAY_AUDIENCE = [
  'You open social media without thinking.',
  'You struggle to study or work without checking your phone.',
  'You lose large amounts of time to short-form content.',
  "You've tried to cut back before and always ended up back where you started.",
  'You reach for your phone the moment you wake up.',
  'You keep scrolling even after you meant to stop.',
  'You want your phone to go back to being a tool, not a habit that runs you.',
]

/** "You may need SlowDay if..." — recognizable moments, not diagnoses. */
export const SLOWDAY_PROBLEM_PROMPTS = [
  'You unlock your phone and forget why.',
  'Five minutes of scrolling becomes an hour.',
  'Your phone is the first thing you reach for in the morning.',
  'You keep trying to reduce your usage but always fall back.',
  'You struggle to leave your phone alone while studying or working.',
]

/** "A look inside SlowDay" — screenshot slots and their static fallback
 * (no `src`, so SlowdayPhoneFrame renders its placeholder). Real
 * screenshots come from the waitlist's own `screenshots` column, set via
 * Admin -> Waitlists -> SlowDay -> Edit -> Screenshots — see
 * resolveSlowdayScreens below, which merges the two. */
export const SLOWDAY_SCREENS: { key: keyof WaitlistScreenshots; label: string; src?: string }[] = [
  { key: 'home', label: 'Home' },
  { key: 'focus', label: 'Focus' },
  { key: 'slowday', label: 'SlowDay' },
  { key: 'progress', label: 'Progress' },
]

export type ResolvedSlowdayScreen = { key: keyof WaitlistScreenshots; label: string; src?: string }

/**
 * Merges admin-uploaded screenshot URLs over the static slot list — a
 * slot with no uploaded URL keeps rendering its placeholder frame. Pass
 * the result to SlowdayHero/SlowdayPreview instead of importing
 * SLOWDAY_SCREENS directly, so both stay in sync with one source.
 */
export function resolveSlowdayScreens(screenshots: WaitlistScreenshots | undefined): ResolvedSlowdayScreen[] {
  return SLOWDAY_SCREENS.map((screen) => ({
    ...screen,
    src: screenshots?.[screen.key] || screen.src,
  }))
}

/** "How SlowDay helps" — benefits, phrased as outcomes, not feature names. */
export const SLOWDAY_BENEFITS = [
  'See where your time actually goes.',
  'Create boundaries around the apps that pull you back.',
  'Put your phone down and protect periods of real focus.',
  'Build a daily system that makes healthy phone use easier to maintain.',
]

export const SLOWDAY_FINAL_CTA_HEADLINE = 'Your phone should be a tool. Not the thing controlling your day.'

export const SLOWDAY_TRUST_TEXT = 'No spam. Just launch updates and early access.'
