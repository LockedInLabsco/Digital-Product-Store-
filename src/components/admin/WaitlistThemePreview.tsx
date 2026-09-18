import type { WaitlistThemeColors } from '@/src/lib/waitlist/theme'

interface WaitlistThemePreviewProps {
  theme: WaitlistThemeColors
  headline: string
  supportingText: string
  buttonText: string
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
}: WaitlistThemePreviewProps) {
  return (
    <div
      className="rounded-lg border border-gray-200 p-6 sm:p-8"
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
