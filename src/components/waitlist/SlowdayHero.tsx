import Container from '@/src/components/Container'
import SlowdayPhoneFrame from './SlowdayPhoneFrame'
import type { WaitlistThemeColors } from '@/src/lib/waitlist/theme'
import { SLOWDAY_HERO_SUPPORTING_NOTE, SLOWDAY_SCREENS } from '@/src/lib/waitlist/slowdayContent'

interface SlowdayHeroProps {
  eyebrow: string
  headline: string
  supportingText: string
  theme: WaitlistThemeColors
}

/**
 * The hero establishes problem-identity first (eyebrow + headline +
 * supporting line come straight from the waitlist's admin-editable
 * copy, see WaitlistForm's "Public page content" section) before any
 * product visual — the screenshots here are a supporting composition,
 * not the opening argument.
 */
export default function SlowdayHero({ eyebrow, headline, supportingText, theme }: SlowdayHeroProps) {
  const heroScreens = SLOWDAY_SCREENS.slice(0, 2)

  return (
    <div id="top">
      <Container className="grid grid-cols-1 items-center gap-14 py-16 sm:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:py-28">
        <div className="text-center lg:text-left" data-reveal="up">
          <p
            className="eyebrow"
            style={{ color: theme.secondaryText }}
          >
            {eyebrow}
          </p>
          <h1
            className="mt-5 font-sans text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl"
            style={{ color: theme.text }}
          >
            {headline}
          </h1>
          <p
            className="mx-auto mt-6 max-w-md text-base leading-relaxed sm:text-lg lg:mx-0"
            style={{ color: theme.secondaryText }}
          >
            {supportingText}
          </p>

          <div className="mt-9 flex flex-col items-center gap-3 lg:items-start">
            <a
              href="#join"
              className="inline-flex w-full items-center justify-center rounded-full px-8 py-4 text-sm font-semibold uppercase tracking-[0.1em] transition-opacity hover:opacity-90 active:scale-[0.98] sm:w-auto"
              style={{ backgroundColor: theme.accent, color: theme.accentText }}
            >
              Join the Waitlist
            </a>
            <p className="text-xs" style={{ color: theme.secondaryText, opacity: 0.75 }}>
              {SLOWDAY_HERO_SUPPORTING_NOTE}
            </p>
          </div>
        </div>

        <div
          className="mx-auto grid w-full max-w-xs grid-cols-2 gap-4 sm:max-w-sm sm:gap-5"
          data-reveal="up"
          data-reveal-delay="1"
        >
          <SlowdayPhoneFrame
            label={heroScreens[0]?.label || 'Home'}
            src={heroScreens[0]?.src}
            theme={theme}
            className="translate-y-4"
            priority
          />
          <SlowdayPhoneFrame
            label={heroScreens[1]?.label || 'Focus'}
            src={heroScreens[1]?.src}
            theme={theme}
            className="-translate-y-4"
            priority
          />
        </div>
      </Container>
    </div>
  )
}
