import Container from '@/src/components/Container'
import type { WaitlistThemeColors } from '@/src/lib/waitlist/theme'
import { SLOWDAY_FINAL_CTA_HEADLINE } from '@/src/lib/waitlist/slowdayContent'

interface SlowdayFinalCtaProps {
  theme: WaitlistThemeColors
}

/**
 * Closing statement — inverted colors (theme.text as background) as a
 * single punctuation mark at the end of the page, still monochrome.
 * Links back up to #join rather than duplicating the form.
 */
export default function SlowdayFinalCta({ theme }: SlowdayFinalCtaProps) {
  return (
    <section className="py-20 sm:py-28" style={{ backgroundColor: theme.text }}>
      <Container className="mx-auto max-w-xl text-center">
        <div data-reveal="up">
          <h2
            className="font-sans text-2xl font-semibold leading-snug sm:text-3xl"
            style={{ color: theme.background }}
          >
            {SLOWDAY_FINAL_CTA_HEADLINE}
          </h2>
          <a
            href="#join"
            className="mt-8 inline-flex items-center justify-center rounded-full px-8 py-4 text-sm font-semibold uppercase tracking-[0.1em] transition-opacity hover:opacity-90 active:scale-[0.98]"
            style={{ backgroundColor: theme.background, color: theme.text }}
          >
            Join the Waitlist
          </a>
        </div>
      </Container>
    </section>
  )
}
