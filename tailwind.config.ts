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
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'Helvetica', 'Arial', 'sans-serif'],
      },
      maxWidth: {
        container: '1280px',
      },
    },
  },
  plugins: [],
}

export default config
