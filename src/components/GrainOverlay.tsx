'use client'

import { usePathname } from 'next/navigation'

/**
 * Fixed, full-viewport film-grain texture for the public site's
 * physical/editorial look (see .grain-overlay in globals.css).
 * Deliberately skipped on /admin — the admin panel keeps its own
 * separate monochrome theme untouched, same pattern AnalyticsProvider
 * uses to opt out of admin routes.
 */
export default function GrainOverlay() {
  const pathname = usePathname()
  if (pathname?.startsWith('/admin')) return null

  return <div className="grain-overlay" aria-hidden="true" />
}
