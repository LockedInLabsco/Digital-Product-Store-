import SlowdaySection from './SlowdaySection'
import SlowdayPhoneFrame from './SlowdayPhoneFrame'
import type { WaitlistThemeColors } from '@/src/lib/waitlist/theme'
import { SLOWDAY_SCREENS } from '@/src/lib/waitlist/slowdayContent'

interface SlowdayPreviewProps {
  theme: WaitlistThemeColors
}

/**
 * "A look inside SlowDay" — the app made visually central, with minimal
 * copy. Each slot is ready for a real screenshot: see SLOWDAY_SCREENS in
 * lib/waitlist/slowdayContent.ts and SlowdayPhoneFrame's doc comment for
 * exactly how to wire real files in without touching this layout.
 */
export default function SlowdayPreview({ theme }: SlowdayPreviewProps) {
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
        {SLOWDAY_SCREENS.map((screen) => (
          <div key={screen.key} className="flex flex-col items-center gap-3">
            <SlowdayPhoneFrame label={screen.label} src={screen.src} theme={theme} />
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
