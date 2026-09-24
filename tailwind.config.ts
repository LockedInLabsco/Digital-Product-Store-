import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Sourced from the CSS variables defined in src/app/globals.css.
        // Edit the palette there — these just wire it into Tailwind
        // utilities (bg-ink, text-cream, border-gold/20, etc.). The
        // utility NAMES are legacy identifiers kept stable across theme
        // revisions; see globals.css for what each currently renders as.
        ink: 'rgb(var(--color-bg) / <alpha-value>)', // main background
        charcoal: 'rgb(var(--color-bg-secondary) / <alpha-value>)', // secondary/alternate section bg
        offwhite: 'rgb(var(--color-bg-card) / <alpha-value>)', // card/panel surface
        elevated: 'rgb(var(--color-bg-elevated) / <alpha-value>)', // available extra surface tier
        deepnavy: 'rgb(var(--color-bg-deep) / <alpha-value>)', // available extra surface tier
        cream: 'rgb(var(--color-text-primary) / <alpha-value>)', // primary text (white)
        beige: 'rgb(var(--color-text-secondary) / <alpha-value>)', // secondary text
        dust: 'rgb(var(--color-text-muted) / <alpha-value>)', // muted text
        gold: 'rgb(var(--color-accent) / <alpha-value>)', // electric blue accent
        'gold-hover': 'rgb(var(--color-accent-bright) / <alpha-value>)', // bright blue hover
        'btn-dark': 'rgb(var(--color-btn-dark-text) / <alpha-value>)', // dark text on light/white buttons
        line: 'rgb(var(--color-border) / <alpha-value>)', // blue-tinted borders/dividers
        // Admin panel's own monochrome dark theme — deliberately separate
        // from the public-site tokens above (ink/cream/gold/...), and from
        // Tailwind's built-in gray/white/black (still used everywhere else
        // in the app, unaffected). Same palette as the SlowDay waitlist's
        // "Monochrome" preset (see lib/waitlist/theme.ts's MONOCHROME).
        admin: {
          bg: '#000000',
          surface: '#141414',
          surface2: '#1F1F1F',
          surface3: '#2A2A2A',
          border: '#333333',
          text: '#FFFFFF',
          muted: '#A6A6A6',
          faint: '#707070',
          accent: '#FFFFFF',
          accentText: '#000000',
          accentHover: '#D4D4D4',
        },
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'Helvetica', 'Arial', 'sans-serif'],
      },
      maxWidth: {
        container: '1280px',
      },
      keyframes: {
        'drift-slow': {
          '0%, 100%': { transform: 'translate3d(0, 0, 0)' },
          '50%': { transform: 'translate3d(0, -14px, 0)' },
        },
        marquee: {
          '0%': { transform: 'translate3d(0, 0, 0)' },
          '100%': { transform: 'translate3d(-50%, 0, 0)' },
        },
      },
      animation: {
        'drift-slow': 'drift-slow 7s var(--tw-ease, ease-in-out) infinite',
        marquee: 'marquee 28s linear infinite',
      },
    },
  },
  plugins: [],
}

export default config
