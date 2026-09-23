import Container from '@/src/components/Container'
import PublicWaitlistForm from '@/src/components/PublicWaitlistForm'
import SlowdayPhoneFrame from './SlowdayPhoneFrame'
import type { WaitlistThemeColors } from '@/src/lib/waitlist/theme'
import type { WaitlistStatus } from '@/src/types/waitlist'
import { SLOWDAY_HERO_SUPPORTING_NOTE, SLOWDAY_SCREENS, SLOWDAY_TRUST_TEXT } from '@/src/lib/waitlist/slowdayContent'

interface SlowdayHeroProps {
  waitlistSlug: string
  status: Exclude<WaitlistStatus, 'draft'>
  eyebrow: string
  headline: string
  supportingText: string
  buttonText: string
  source: string
  theme: WaitlistThemeColors
}

/**
 * The hero doubles as the join section (id="join", scroll target for the
 * header's and final CTA's "Join Waitlist" links) — problem-identity
 * copy on top, then the actual signup form on the left and two product
 * screenshots on the right, so signing up never requires scrolling past
 * the rest of the page. Reuses PublicWaitlistForm's real state machine
 * (same /api/waitlist/[slug] contract, same loading/error/duplicate/
 * success states) via its `embedded` layout mode, just placed here
 * instead of in its own centered section.
 */
export default function SlowdayHero({
  waitlistSlug,
  status,
  eyebrow,
  headline,
  supportingText,
  buttonText,
  source,
  theme,
}: SlowdayHeroProps) {
  const heroScreens = SLOWDAY_SCREENS.slice(0, 2)

  return (
    <div id="join" className="scroll-mt-20 sm:scroll-mt-24">
      <Container className="py-16 sm:py-24 lg:py-28">
        <div className="mx-auto max-w-2xl text-center" data-reveal="up">
          <p className="eyebrow" style={{ color: theme.secondaryText }}>
            {eyebrow}
          </p>
          <h1
            className="mt-5 font-sans text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl"
            style={{ color: theme.text }}
          >
            {headline}
          </h1>
          <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed sm:text-lg" style={{ color: theme.secondaryText }}>
            {supportingText}
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl grid-cols-1 items-start gap-10 sm:mt-16 lg:grid-cols-2 lg:gap-16">
          <div data-reveal="up" data-reveal-delay="1">
            {status === 'closed' ? (
              <div
                className="rounded-2xl border px-5 py-6 text-left"
                style={{ borderColor: theme.border, backgroundColor: theme.surface }}
              >
                <p className="text-sm font-semibold" style={{ color: theme.text }}>
                  This waitlist is currently closed.
                </p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: theme.secondaryText }}>
                  Check back soon — we&apos;ll reopen signups here.
                </p>
              </div>
            ) : (
              <PublicWaitlistForm
                waitlistSlug={waitlistSlug}
                buttonText={buttonText}
                source={source}
                theme={theme}
                headlineFont="sans"
                panel
                trustText={SLOWDAY_TRUST_TEXT}
                embedded
              />
            )}
            <p className="mt-4 text-xs" style={{ color: theme.secondaryText, opacity: 0.75 }}>
              {SLOWDAY_HERO_SUPPORTING_NOTE}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:gap-5" data-reveal="up" data-reveal-delay="2">
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
        </div>
      </Container>
    </div>
  )
}
