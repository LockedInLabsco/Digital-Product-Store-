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
        // utilities (bg-ink, text-cream, border-gold/20, etc.).
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        charcoal: 'rgb(var(--color-charcoal) / <alpha-value>)',
        cream: 'rgb(var(--color-cream) / <alpha-value>)',
        beige: 'rgb(var(--color-beige) / <alpha-value>)',
        dust: 'rgb(var(--color-dust) / <alpha-value>)',
        gold: 'rgb(var(--color-gold) / <alpha-value>)',
        'gold-hover': 'rgb(var(--color-gold-hover) / <alpha-value>)',
        offwhite: 'rgb(var(--color-offwhite) / <alpha-value>)',
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
