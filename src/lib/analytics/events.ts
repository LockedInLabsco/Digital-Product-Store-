'use client'

import { getPostHogInstance, isPostHogInitialized } from './posthogClient'
import { getAttributionSnapshot, getDeviceCategory } from './attribution'

/**
 * Every event this site can send to PostHog, with its exact property
 * shape. Track() is the only place components should ever call
 * posthog.capture — this keeps event names and property keys from
 * drifting out of sync across the codebase.
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

interface ProductProps {
  product_id: string
  product_slug: string
  product_title: string
  product_type: 'free' | 'paid'
  displayed_price?: number
  currency?: string
}

export interface AnalyticsEventMap {
  homepage_viewed: {}
  hero_cta_clicked: { button_location: string; destination: string }
  navigation_clicked: { button_location: string; destination: string; label: string }
  // products_section_viewed is intentionally not a separate event — it's
  // covered by section_viewed with section_id: 'products' (see
  // SectionEngagementTracker + data-section-id="products" on the
  // homepage), avoiding two events for the same moment.
  product_card_clicked: ProductProps & { button_location: string }
  product_page_viewed: ProductProps
  free_download_started: ProductProps
  free_download_completed: ProductProps
  free_download_failed: ProductProps & { reason?: string }
  paid_checkout_started: ProductProps & { button_location: string }
  paid_checkout_opened: ProductProps
  paid_checkout_abandoned: ProductProps
  purchase_completed: ProductProps
  purchase_failed: ProductProps & { reason?: string }
  email_signup_completed: { button_location: string }
  outbound_social_clicked: { destination: string; label: string }
  section_viewed: { section_id: string }
  section_engagement_completed: {
    section_id: string
    engaged_seconds: number
    maximum_visibility_percentage: number
  }
}

export type AnalyticsEventName = keyof AnalyticsEventMap

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

/** Builds the common ProductProps shape from a product-like object. */
export function productEventProps(product: {
  id: string
  slug: string
  title: string
  price: number
  currency?: string
}): ProductProps {
  return {
    product_id: product.id,
    product_slug: product.slug,
    product_title: product.title,
    product_type: product.price === 0 ? 'free' : 'paid',
    displayed_price: product.price,
    currency: product.currency || 'USD',
  }
}
