import SlowdaySection from './SlowdaySection'
import type { WaitlistThemeColors } from '@/src/lib/waitlist/theme'
import { SLOWDAY_AUDIENCE } from '@/src/lib/waitlist/slowdayContent'

interface SlowdayAudienceProps {
  theme: WaitlistThemeColors
}

/**
 * "Who SlowDay is for" — describes people and moments, not features. An
 * editorial list (thin rules, generous line-height) rather than a
 * feature-card grid, on purpose (see the design brief this component
 * implements: problem-identity before product).
 */
export default function SlowdayAudience({ theme }: SlowdayAudienceProps) {
  return (
    <SlowdaySection maxWidth="xl">
      <h2
        className="text-center font-sans text-2xl font-semibold tracking-tight sm:text-3xl"
        style={{ color: theme.text }}
        data-reveal="up"
      >
        Who SlowDay is for
      </h2>

      <ul className="mt-10 divide-y" style={{ borderColor: theme.border }} data-reveal="up">
        {SLOWDAY_AUDIENCE.map((line) => (
          <li
            key={line}
            className="border-t py-5 text-base leading-relaxed first:border-t-0 sm:text-lg"
            style={{ borderColor: theme.border, color: theme.text }}
          >
            {line}
          </li>
        ))}
      </ul>
    </SlowdaySection>
  )
}
