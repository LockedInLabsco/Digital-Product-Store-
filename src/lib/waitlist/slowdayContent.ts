/**
 * SlowDay-specific presentation used by the dedicated /waitlist/[slug]
 * page (the headline/supporting text/button copy itself lives on the
 * waitlist's own database row and is editable from the admin).
 *
 * SLOWDAY_EYEBROW/SLOWDAY_FEATURES back the *generic* themed layout
 * (theme_config.layout === 'standard', or unset) — kept so the page
 * still renders sensibly if the standalone layout flag is ever missing
 * or turned off. The rest feeds the dedicated standalone page
 * (components/waitlist/StandaloneWaitlistPage + SlowdayHero) — a
 * deliberately simple two-card layout, so there's no longer any
 * screenshot/audience/problem/benefits copy to keep in sync here.
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

export const SLOWDAY_TRUST_TEXT = 'No spam. Just launch updates and early access.'
