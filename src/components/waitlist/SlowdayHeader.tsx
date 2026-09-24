import type { WaitlistThemeColors } from '@/src/lib/waitlist/theme'

interface SlowdayHeaderProps {
  theme: WaitlistThemeColors
  buttonText: string
}

/**
 * SlowDay's own, extremely minimal header — deliberately NOT the site
 * Navbar. No Products/About/Manifesto/store nav: just the wordmark and a
 * single "Join Waitlist" action that scroll-links to the signup section
 * (html has scroll-behavior: smooth globally, see globals.css, and
 * respects prefers-reduced-motion there too).
 */
export default function SlowdayHeader({ theme, buttonText }: SlowdayHeaderProps) {
  return (
    <header
      className="sticky top-0 z-40 border-b backdrop-blur"
      style={{ borderColor: theme.border, backgroundColor: `${theme.background}F2` }}
    >
      <div className="mx-auto flex h-[68px] max-w-5xl items-center justify-between px-6 sm:px-8">
        <a href="#top" className="flex items-baseline gap-2" aria-label="SlowDay home">
          <span className="font-sans text-lg font-semibold tracking-tight" style={{ color: theme.text }}>
            SlowDay
          </span>
          <span
            className="hidden text-[0.65rem] font-medium uppercase tracking-[0.1em] sm:inline"
            style={{ color: theme.secondaryText, opacity: 0.7 }}
          >
            by NOT4NORMAL
          </span>
        </a>

        <a
          href="#join"
          className="tactile-press inline-flex items-center justify-center rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] transition-opacity hover:opacity-85 sm:px-5 sm:py-2.5"
          style={{ backgroundColor: theme.accent, color: theme.accentText }}
        >
          {buttonText}
        </a>
      </div>
    </header>
  )
}
