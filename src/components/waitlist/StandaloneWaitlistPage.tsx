import Container from '@/src/components/Container'
import SlowdayHeader from './SlowdayHeader'
import SlowdayHero from './SlowdayHero'
import SlowdayAudience from './SlowdayAudience'
import SlowdayProblemSection from './SlowdayProblemSection'
import SlowdayPreview from './SlowdayPreview'
import SlowdayHowItHelps from './SlowdayHowItHelps'
import SlowdayWaitlistSection from './SlowdayWaitlistSection'
import SlowdayFinalCta from './SlowdayFinalCta'
import SlowdayFooter from './SlowdayFooter'
import type { WaitlistThemeColors } from '@/src/lib/waitlist/theme'
import type { Waitlist } from '@/src/types/waitlist'
import { SLOWDAY_DEFAULT_SUPPORTING_TEXT, SLOWDAY_EYEBROW } from '@/src/lib/waitlist/slowdayContent'

const DEFAULT_BUTTON_TEXT = 'Join the waitlist'

interface StandaloneWaitlistPageProps {
  waitlist: Waitlist
  theme: WaitlistThemeColors
  source: string
  isDraftPreview: boolean
}

/**
 * The dedicated SlowDay presentation — swapped in by
 * /waitlist/[slug]/page.tsx whenever theme_config.layout === 'standalone'
 * (see isStandaloneLayout in lib/waitlist/theme.ts). Every other waitlist
 * keeps going through the existing generic Navbar/Footer/PublicWaitlistForm
 * layout in that same file, untouched.
 *
 * Copy hierarchy follows the design brief: problem-identity (Hero) → who
 * it's for (Audience) → emotional relevance (Problem prompts) → the
 * product (Preview) → how it helps (benefits) → join (Waitlist section) →
 * final CTA. Headline/supporting text/button text stay admin-editable
 * (same waitlist row, same WaitlistForm), everything else below the hero
 * is SlowDay-specific static copy (see lib/waitlist/slowdayContent.ts).
 */
export default function StandaloneWaitlistPage({
  waitlist,
  theme,
  source,
  isDraftPreview,
}: StandaloneWaitlistPageProps) {
  const headline = waitlist.headline || waitlist.name
  const supportingText = waitlist.supporting_text || waitlist.description || SLOWDAY_DEFAULT_SUPPORTING_TEXT
  const buttonText = waitlist.button_text || DEFAULT_BUTTON_TEXT
  const status = waitlist.status

  if (status === 'draft') {
    return (
      <div className="min-h-screen" style={{ backgroundColor: theme.background }}>
        <SlowdayHeader theme={theme} buttonText={buttonText} />
        <main className="flex min-h-[60vh] items-center">
          <Container className="mx-auto max-w-xl text-center">
            {isDraftPreview && <PreviewBanner theme={theme} />}
            <p className="eyebrow" style={{ color: theme.secondaryText }}>
              {SLOWDAY_EYEBROW}
            </p>
            <h1 className="mt-4 font-sans text-3xl font-semibold leading-snug sm:text-4xl" style={{ color: theme.text }}>
              {headline}
            </h1>
            <p
              className="mx-auto mt-6 max-w-md rounded-2xl border px-5 py-4 text-sm leading-relaxed"
              style={{ borderColor: theme.border, backgroundColor: theme.surface, color: theme.secondaryText }}
            >
              This page isn&apos;t open to the public yet.
            </p>
          </Container>
        </main>
        <SlowdayFooter theme={theme} />
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.background, color: theme.text }}>
      <SlowdayHeader theme={theme} buttonText={buttonText} />
      {isDraftPreview && (
        <Container className="mx-auto mt-6 max-w-2xl">
          <PreviewBanner theme={theme} />
        </Container>
      )}
      <main>
        <SlowdayHero eyebrow={SLOWDAY_EYEBROW} headline={headline} supportingText={supportingText} theme={theme} />
        <SlowdayAudience theme={theme} />
        <SlowdayProblemSection theme={theme} />
        <SlowdayPreview theme={theme} />
        <SlowdayHowItHelps theme={theme} />
        <SlowdayWaitlistSection
          waitlistSlug={waitlist.slug}
          status={status}
          buttonText={buttonText}
          source={source}
          theme={theme}
        />
        <SlowdayFinalCta theme={theme} />
      </main>
      <SlowdayFooter theme={theme} />
    </div>
  )
}

function PreviewBanner({ theme }: { theme: WaitlistThemeColors }) {
  return (
    <div
      className="rounded-sm border p-4 text-center text-xs font-semibold uppercase tracking-[0.1em]"
      style={{ borderColor: theme.accent, color: theme.accent }}
    >
      Draft preview — this page is not publicly visible yet
    </div>
  )
}
