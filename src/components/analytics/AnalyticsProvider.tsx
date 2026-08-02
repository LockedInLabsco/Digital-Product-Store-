'use client'

import { Suspense, useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import {
  getStoredConsent,
  setStoredConsent,
  broadcastConsentChange,
  CONSENT_CHANGE_EVENT,
  ConsentChoice,
} from '@/src/lib/analytics/consent'
import {
  initPostHog,
  isPostHogConfigured,
  pauseAnalytics,
  resumeAnalytics,
} from '@/src/lib/analytics/posthogClient'
import { captureAttribution } from '@/src/lib/analytics/attribution'
import ConsentBanner from './ConsentBanner'
import PostHogPageviewTracker from './PostHogPageviewTracker'
import SectionEngagementTracker from './SectionEngagementTracker'

/**
 * Mounted once in the root layout. Owns: attribution capture, consent
 * state, PostHog init/pause, and the consent banner. Deliberately does
 * nothing on /admin routes — PostHog is never initialized there, and
 * any already-running session is paused the moment an /admin path is
 * reached (e.g. an admin who was just browsing the public site).
 */
export default function AnalyticsProvider() {
  const pathname = usePathname()
  const isAdminRoute = Boolean(pathname?.startsWith('/admin'))
  const [consent, setConsent] = useState<ConsentChoice | null>(null)
  const [bannerVisible, setBannerVisible] = useState(false)

  useEffect(() => {
    if (isAdminRoute) return
    captureAttribution()
    const stored = getStoredConsent()
    setConsent(stored)
    setBannerVisible(stored === null)
    // Only run once per mount — attribution/consent are read at load time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (isAdminRoute) {
      pauseAnalytics()
      return
    }

    if (consent === 'accepted' && isPostHogConfigured()) {
      initPostHog()
      resumeAnalytics()
    } else if (consent === 'rejected') {
      pauseAnalytics()
    }
  }, [consent, isAdminRoute])

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<ConsentChoice>).detail
      setConsent(detail)
      setBannerVisible(false)
    }
    window.addEventListener(CONSENT_CHANGE_EVENT, handler)
    return () => window.removeEventListener(CONSENT_CHANGE_EVENT, handler)
  }, [])

  if (isAdminRoute) return null

  const handleAccept = () => {
    setStoredConsent('accepted')
    broadcastConsentChange('accepted')
  }

  const handleReject = () => {
    setStoredConsent('rejected')
    broadcastConsentChange('rejected')
  }

  return (
    <>
      {consent === 'accepted' && (
        <Suspense fallback={null}>
          <PostHogPageviewTracker />
        </Suspense>
      )}
      {consent === 'accepted' && <SectionEngagementTracker />}
      {bannerVisible && <ConsentBanner onAccept={handleAccept} onReject={handleReject} />}
    </>
  )
}
