import type { WaitlistThemeColors } from '@/src/lib/waitlist/theme'
import { hexToRgba } from '@/src/lib/waitlist/theme'

interface SlowdayPhoneFrameProps {
  label: string
  theme: WaitlistThemeColors
  /** Real screenshot path (e.g. "/slowday/screenshots/home.png"). Omit to
   * render a calm placeholder frame with just the label — see
   * lib/waitlist/slowdayContent.ts's SLOWDAY_SCREENS for where to wire
   * real files in once they exist. */
  src?: string
  className?: string
  priority?: boolean
}

/**
 * A minimal phone silhouette used as the screenshot slot throughout the
 * SlowDay landing page. Pure presentation — same frame renders either a
 * real screenshot (once one is supplied) or a placeholder, so dropping
 * in real assets later never requires touching layout.
 */
export default function SlowdayPhoneFrame({
  label,
  theme,
  src,
  className = '',
  priority = false,
}: SlowdayPhoneFrameProps) {
  return (
    <div
      className={`relative aspect-[9/19.5] w-full overflow-hidden rounded-[2rem] border shadow-[0_1px_2px_rgba(0,0,0,0.04),0_24px_48px_-24px_rgba(0,0,0,0.18)] ${className}`}
      style={{ borderColor: theme.border, backgroundColor: theme.surface }}
    >
      {/* Dynamic-island notch — purely decorative, keeps the frame reading as a phone even as a placeholder. */}
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-3 z-10 h-[18px] w-[72px] -translate-x-1/2 rounded-full"
        style={{ backgroundColor: theme.text, opacity: 0.85 }}
      />

      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- external/CMS-less asset slot, dimensions vary until real screenshots land
        <img
          src={src}
          alt={`SlowDay — ${label} screen`}
          className="h-full w-full object-cover"
          loading={priority ? 'eager' : 'lazy'}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center">
          <span
            aria-hidden="true"
            className="h-10 w-10 rounded-full border"
            style={{ borderColor: theme.border, backgroundColor: hexToRgba(theme.text, 0.06) }}
          />
          <p
            className="text-[0.68rem] font-semibold uppercase tracking-[0.16em]"
            style={{ color: theme.secondaryText }}
          >
            {label}
          </p>
          <p className="text-[0.68rem] leading-relaxed" style={{ color: theme.secondaryText, opacity: 0.7 }}>
            Screenshot coming soon
          </p>
        </div>
      )}
    </div>
  )
}
