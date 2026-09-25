import SlowdaySection from './SlowdaySection'
import type { WaitlistThemeColors } from '@/src/lib/waitlist/theme'
import { SLOWDAY_PROBLEM_PROMPTS } from '@/src/lib/waitlist/slowdayContent'

interface SlowdayProblemSectionProps {
  theme: WaitlistThemeColors
}

/**
 * "You may need SlowDay if..." — recognizable moments the visitor can
 * see themselves in, on a lightly tinted band (theme.surface) so it
 * reads as its own beat rather than blending into Audience above it.
 * Deliberately no diagnostic or medical framing.
 */
export default function SlowdayProblemSection({ theme }: SlowdayProblemSectionProps) {
  return (
    <SlowdaySection maxWidth="xl" style={{ backgroundColor: theme.surface }}>
      <h2
        className="text-center font-sans text-2xl font-semibold tracking-tight sm:text-3xl"
        style={{ color: theme.text }}
        data-reveal="up"
      >
        You may need SlowDay if...
      </h2>

      <ul className="mt-10 space-y-5" data-reveal="up">
        {SLOWDAY_PROBLEM_PROMPTS.map((line) => (
          <li key={line} className="flex items-start gap-4">
            <span
              aria-hidden="true"
              className="mt-2.5 h-1 w-1 flex-shrink-0 rounded-full"
              style={{ backgroundColor: theme.accent }}
            />
            <p className="text-base leading-relaxed sm:text-lg" style={{ color: theme.text }}>
              {line}
            </p>
          </li>
        ))}
      </ul>
    </SlowdaySection>
  )
}
