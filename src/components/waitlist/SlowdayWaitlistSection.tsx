import Container from '@/src/components/Container'
import PublicWaitlistForm from '@/src/components/PublicWaitlistForm'
import type { WaitlistThemeColors } from '@/src/lib/waitlist/theme'
import type { WaitlistStatus } from '@/src/types/waitlist'
import { SLOWDAY_TRUST_TEXT } from '@/src/lib/waitlist/slowdayContent'

interface SlowdayWaitlistSectionProps {
  waitlistSlug: string
  status: Exclude<WaitlistStatus, 'draft'>
  buttonText: string
  source: string
  theme: WaitlistThemeColors
}

/**
 * The one section that actually talks to the backend — reuses
 * PublicWaitlistForm as-is (same /api/waitlist/[slug] contract, same
 * loading/error/duplicate/success states, same PostHog signup events),
 * just restyled via its existing theme/panel/trustText props. The
 * 'draft' status is handled one level up (StandaloneWaitlistPage never
 * renders this section for a draft waitlist).
 */
export default function SlowdayWaitlistSection({
  waitlistSlug,
  status,
  buttonText,
  source,
  theme,
}: SlowdayWaitlistSectionProps) {
  if (status === 'closed') {
    return (
      <section id="join" className="scroll-mt-20 py-16 sm:scroll-mt-24 sm:py-24">
        <Container className="mx-auto max-w-2xl text-center">
          <div data-reveal="up">
            <p className="eyebrow" style={{ color: theme.secondaryText }}>
              SlowDay
            </p>
            <h2
              className="mt-4 font-sans text-3xl font-semibold leading-snug sm:text-4xl"
              style={{ color: theme.text }}
            >
              Join the SlowDay waitlist
            </h2>
            <p
              className="mx-auto mt-6 max-w-md rounded-2xl border px-5 py-4 text-sm leading-relaxed"
              style={{ borderColor: theme.border, backgroundColor: theme.surface, color: theme.secondaryText }}
            >
              This waitlist is currently closed. Check back soon.
            </p>
          </div>
        </Container>
      </section>
    )
  }

  return (
    <section id="join" className="scroll-mt-20 py-16 sm:scroll-mt-24 sm:py-24">
      <PublicWaitlistForm
        waitlistSlug={waitlistSlug}
        eyebrow="SlowDay"
        headline="Be there from Day 1."
        supportingText="Join now and you'll be the first to know when SlowDay opens up."
        buttonText={buttonText}
        source={source}
        theme={theme}
        headlineFont="sans"
        panel
        trustText={SLOWDAY_TRUST_TEXT}
      />
    </section>
  )
}
