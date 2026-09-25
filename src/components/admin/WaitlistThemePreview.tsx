import { hexToRgba, type WaitlistThemeColors } from '@/src/lib/waitlist/theme'

interface WaitlistThemePreviewProps {
  theme: WaitlistThemeColors
  headline: string
  supportingText: string
  buttonText: string
  /** The standalone layout (currently SlowDay) renders as a two-card
   * pairing — form + description — instead of the generic single
   * centered column every other waitlist uses. Mirror whichever one is
   * actually live so this preview never lies about the real page. */
  isStandalone?: boolean
}

/**
 * Miniature, non-functional mockup of the public waitlist page using
 * the theme's actual resolved colors via inline styles — deliberately
 * NOT built from the site's Tailwind color classes (bg-ink, text-cream,
 * etc.), since those are fixed to the global theme and reusing them
 * here would risk this preview leaking into (or being overridden by)
 * the real site theme instead of showing the waitlist's own colors.
 */
export default function WaitlistThemePreview({
  theme,
  headline,
  supportingText,
  buttonText,
  isStandalone = false,
}: WaitlistThemePreviewProps) {
  const glassStyle = {
    backgroundColor: hexToRgba(theme.surface, 0.55),
    backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0) 45%)',
    borderColor: theme.border,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.09), 0 1px 1px rgba(0,0,0,0.03)',
  }

  if (isStandalone) {
    return (
      <div
        className="rounded-lg border border-admin-border p-6 sm:p-8"
        style={{ backgroundColor: theme.background }}
      >
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em]" style={{ color: theme.accent }}>
          Preview — standalone layout
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div
            className="flex flex-col gap-2.5 rounded-xl border p-4 backdrop-blur-xl"
            style={glassStyle}
          >
            <div
              className="rounded-sm border px-2.5 py-2 text-xs"
              style={{ backgroundColor: theme.surface, borderColor: theme.border, color: theme.secondaryText }}
            >
              you@example.com
            </div>
            <div
              className="rounded-sm border px-2.5 py-2 text-xs"
              style={{ backgroundColor: theme.surface, borderColor: theme.border, color: theme.secondaryText }}
            >
              @yourusername
            </div>
            <button
              type="button"
              disabled
              className="rounded-sm px-3 py-2 text-xs font-semibold uppercase tracking-[0.1em]"
              style={{ backgroundColor: theme.accent, color: theme.accentText }}
            >
              {buttonText || 'Join the waitlist'}
            </button>
          </div>

          <div className="rounded-xl border p-4 backdrop-blur-xl" style={glassStyle}>
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.18em]" style={{ color: theme.secondaryText }}>
              Eyebrow
            </p>
            <h3 className="mt-2 text-lg font-semibold leading-snug" style={{ color: theme.text }}>
              {headline || 'Your headline here.'}
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed" style={{ color: theme.secondaryText }}>
              {supportingText || 'Supporting text goes here.'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="rounded-lg border border-admin-border p-6 sm:p-8"
      style={{ backgroundColor: theme.background }}
    >
      <p
        className="text-[0.65rem] font-semibold uppercase tracking-[0.18em]"
        style={{ color: theme.accent }}
      >
        Preview
      </p>
      <h3 className="mt-3 text-xl font-semibold leading-snug sm:text-2xl" style={{ color: theme.text }}>
        {headline || 'Your headline here.'}
      </h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed" style={{ color: theme.secondaryText }}>
        {supportingText || 'Supporting text shown under the headline goes here.'}
      </p>

      <div className="mt-5 flex max-w-xs flex-col gap-3">
        <div
          className="rounded-sm border px-3 py-2.5 text-xs"
          style={{ backgroundColor: theme.surface, borderColor: theme.border, color: theme.secondaryText }}
        >
          you@example.com
        </div>
        <div
          className="rounded-sm border px-3 py-2.5 text-xs"
          style={{ backgroundColor: theme.surface, borderColor: theme.border, color: theme.secondaryText }}
        >
          @yourusername
        </div>
        <button
          type="button"
          disabled
          className="rounded-sm px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em]"
          style={{ backgroundColor: theme.accent, color: theme.accentText }}
        >
          {buttonText || 'Join the waitlist'}
        </button>
      </div>
    </div>
  )
}
