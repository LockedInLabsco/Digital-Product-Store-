import SlowdaySection from './SlowdaySection'
import SlowdayPhoneFrame from './SlowdayPhoneFrame'
import DepthCard from '@/src/components/motion/DepthCard'
import type { WaitlistThemeColors } from '@/src/lib/waitlist/theme'
import type { ResolvedSlowdayScreen } from '@/src/lib/waitlist/slowdayContent'

interface SlowdayPreviewProps {
  theme: WaitlistThemeColors
  /** Resolved via resolveSlowdayScreens() — see StandaloneWaitlistPage. */
  screens: ResolvedSlowdayScreen[]
}

/**
 * "A look inside SlowDay" — the app made visually central, with minimal
 * copy. Real screenshots come from the waitlist's own `screenshots`
 * column (Admin -> Waitlists -> SlowDay -> Edit -> Screenshots); any
 * slot left empty renders SlowdayPhoneFrame's calm placeholder instead.
 */
export default function SlowdayPreview({ theme, screens }: SlowdayPreviewProps) {
  return (
    <SlowdaySection maxWidth="4xl">
      <h2
        className="text-center font-sans text-2xl font-semibold tracking-tight sm:text-3xl"
        style={{ color: theme.text }}
        data-reveal="up"
      >
        A look inside SlowDay
      </h2>

      <div
        className="mx-auto mt-10 grid max-w-2xl grid-cols-2 gap-4 sm:gap-6 lg:max-w-none lg:grid-cols-4"
        data-reveal="up"
      >
        {screens.map((screen) => (
          <div key={screen.key} className="perspective-1000 flex flex-col items-center gap-3">
            <DepthCard maxTilt={5} className="w-full">
              <SlowdayPhoneFrame label={screen.label} src={screen.src} theme={theme} />
            </DepthCard>
            <p
              className="text-xs font-medium uppercase tracking-[0.08em]"
              style={{ color: theme.secondaryText }}
            >
              {screen.label}
            </p>
          </div>
        ))}
      </div>
    </SlowdaySection>
  )
}
