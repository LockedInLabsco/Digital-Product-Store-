import Container from '@/src/components/Container'
import PublicWaitlistForm from '@/src/components/PublicWaitlistForm'
import { hexToRgba, type WaitlistThemeColors } from '@/src/lib/waitlist/theme'
import type { WaitlistStatus } from '@/src/types/waitlist'
import { SLOWDAY_HERO_SUPPORTING_NOTE, SLOWDAY_TRUST_TEXT } from '@/src/lib/waitlist/slowdayContent'

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
 * The entire page, in effect — a simple two-card pairing: the waitlist
 * form on one side, an editorial description of SlowDay on the other.
 * id="join" is kept as the scroll target for the header's "Join
 * Waitlist" link. Reuses PublicWaitlistForm's real state machine (same
 * /api/waitlist/[slug] contract, same loading/error/duplicate/success
 * states) via its `embedded` + `panel` modes exactly as before — only
 * the surrounding layout changed.
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
  return (
    <div id="join" className="scroll-mt-20 sm:scroll-mt-24">
      <Container className="flex min-h-[calc(100vh-68px)] items-center py-16 sm:py-20">
        <div className="mx-auto grid w-full max-w-5xl grid-cols-1 items-center gap-6 lg:grid-cols-[45fr_55fr] lg:gap-8">
          {/* Description card — first in source order so it also comes
              first on mobile; reordered to sit on the right on desktop. */}
          <div
            className="order-1 rounded-2xl border px-7 py-10 backdrop-blur-xl sm:px-9 sm:py-12 lg:order-2"
            style={{ backgroundColor: hexToRgba(theme.surface, 0.72), borderColor: theme.border }}
            data-reveal="up"
          >
            <p className="eyebrow" style={{ color: theme.secondaryText }}>
              {eyebrow}
            </p>
            <h1
              className="mt-5 font-sans text-3xl font-semibold leading-[1.12] tracking-tight sm:text-4xl lg:text-[2.75rem]"
              style={{ color: theme.text }}
            >
              {headline}
            </h1>
            <p className="mt-6 text-base leading-relaxed sm:text-lg" style={{ color: theme.secondaryText }}>
              {supportingText}
            </p>
          </div>

          {/* Waitlist form card — second in source order (second on
              mobile), reordered to sit on the left on desktop. */}
          <div className="order-2 lg:order-1" data-reveal="up" data-reveal-delay="1">
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
              <>
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
                <p className="mt-4 text-xs" style={{ color: theme.secondaryText, opacity: 0.75 }}>
                  {SLOWDAY_HERO_SUPPORTING_NOTE}
                </p>
              </>
            )}
          </div>
        </div>
      </Container>
    </div>
  )
}
