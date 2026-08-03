'use client'

import { getPostHogInstance, isPostHogInitialized } from './posthogClient'
import { getAttributionSnapshot, getDeviceCategory } from './attribution'
import type { AnalyticsEventMap, AnalyticsEventName } from './eventTypes'

export type { AnalyticsEventMap, AnalyticsEventName }
// productEventProps is intentionally NOT re-exported here — import it
// from ./eventTypes directly. Re-exporting it from this 'use client'
// file would recreate the exact bug this split fixes: any Server
// Component importing it from here (instead of ./eventTypes) would get
// an RSC client-reference stub instead of the real function again.

/**
 * track() is the only place components should ever call
 * posthog.capture — this keeps event names and property keys from
 * drifting out of sync across the codebase. Event names/shapes are
 * defined in ./eventTypes.
 */

interface CommonProps {
  page_path?: string
  source?: string | null
  medium?: string | null
  campaign?: string | null
  content?: string | null
  term?: string | null
  referrer_domain?: string | null
  landing_page?: string | null
  device_category?: string
}

/**
 * Sends a typed analytics event. Safe to call unconditionally —
 * silently no-ops if PostHog isn't configured or the visitor hasn't
 * consented (posthog-js itself is never initialized in that case, and
 * .capture() below is guarded defensively regardless).
 */
export function track<Name extends AnalyticsEventName>(
  name: Name,
  properties: AnalyticsEventMap[Name]
): void {
  if (typeof window === 'undefined') return
  if (!isPostHogInitialized()) return
  if (window.location.pathname.startsWith('/admin')) return

  const instance = getPostHogInstance()
  if (!instance) return

  try {
    const common = attributionAsCommonProps()
    instance.capture(name, { ...common, ...properties })
  } catch (error) {
    // Analytics must never break the page it's tracking.
    console.warn('[analytics] track() failed', name, error)
  }
}

function attributionAsCommonProps(): CommonProps {
  try {
    const snapshot = getAttributionSnapshot()
    return {
      page_path: window.location.pathname,
      source: snapshot.lastTouch.source,
      medium: snapshot.lastTouch.medium,
      campaign: snapshot.lastTouch.campaign,
      content: snapshot.lastTouch.content,
      term: snapshot.lastTouch.term,
      referrer_domain: snapshot.referrerDomain,
      landing_page: snapshot.landingPage,
      device_category: getDeviceCategory(),
    }
  } catch {
    return {}
  }
}
