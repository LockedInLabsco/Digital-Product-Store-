import type { Metadata } from 'next'
import './globals.css'
import MotionProvider from '@/src/components/MotionProvider'
import CinematicEffects from '@/src/components/CinematicEffects'

export const metadata: Metadata = {
  metadataBase: new URL('https://not4normal.store'),
  title: {
    default: 'Not4Normal — Create Your Own Path',
    template: '%s — Not4Normal',
  },
  description:
    'Tools for people building their way out. Create your own path.',
  openGraph: {
    title: 'Not4Normal — Create Your Own Path',
    description: 'Tools for people building their way out.',
    url: 'https://not4normal.store',
    siteName: 'Not4Normal',
    images: [
      {
        url: '/campaign/hero-athlete.jpg',
        width: 1875,
        height: 839,
        alt: 'Athlete training alone on a steep concrete incline',
      },
    ],
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-black text-white antialiased">
        <MotionProvider />
        <CinematicEffects />
        {children}
      </body>
    </html>
  )
}
