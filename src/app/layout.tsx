import type { Metadata } from 'next'
import { Playfair_Display, Inter } from 'next/font/google'
import './globals.css'
import MotionProvider from '@/src/components/MotionProvider'

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-serif',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://not4normal.store'),
  title: {
    default: 'Not4Normal — Create Your Own Path',
    template: '%s — Not4Normal',
  },
  description:
    'Premium digital tools for focus, discipline, habits, and personal growth. Not made for normal.',
  openGraph: {
    title: 'Not4Normal — Create Your Own Path',
    description: 'Premium digital tools for focus, discipline, habits, and personal growth.',
    url: 'https://not4normal.store',
    siteName: 'Not4Normal',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${playfairDisplay.variable} ${inter.variable}`}>
      <body className="bg-cream text-ink antialiased font-sans">
        <MotionProvider />
        {children}
      </body>
    </html>
  )
}
