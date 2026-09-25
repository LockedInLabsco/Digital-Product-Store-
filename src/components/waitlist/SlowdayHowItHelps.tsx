import SlowdaySection from './SlowdaySection'
import type { WaitlistThemeColors } from '@/src/lib/waitlist/theme'
import { SLOWDAY_BENEFITS } from '@/src/lib/waitlist/slowdayContent'

interface SlowdayHowItHelpsProps {
  theme: WaitlistThemeColors
}

/**
 * "How SlowDay helps" — comes only after Audience/Problem/Preview have
 * established relevance. Outcomes in plain language, not a feature-name
 * list (no "Screen-time insights • App blocking • ..." bullet row).
 */
export default function SlowdayHowItHelps({ theme }: SlowdayHowItHelpsProps) {
  return (
    <SlowdaySection maxWidth="xl" style={{ backgroundColor: theme.surface }}>
      <h2
        className="text-center font-sans text-2xl font-semibold tracking-tight sm:text-3xl"
        style={{ color: theme.text }}
        data-reveal="up"
      >
        How SlowDay helps
      </h2>

      <ul className="mx-auto mt-10 max-w-md space-y-6" data-reveal="up">
        {SLOWDAY_BENEFITS.map((line) => (
          <li key={line} className="border-l-2 pl-5" style={{ borderColor: theme.accent }}>
            <p className="text-base leading-relaxed sm:text-lg" style={{ color: theme.text }}>
              {line}
            </p>
          </li>
        ))}
      </ul>
    </SlowdaySection>
  )
}
