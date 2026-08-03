/**
 * Event name/property types plus pure, isomorphic helpers.
 *
 * Deliberately NOT a 'use client' module. Server Components (e.g. the
 * product detail page) need to call productEventProps() directly to
 * compute serializable props for a client tracking component — if this
 * lived in events.ts (which is 'use client', since it also wraps
 * posthog-js/window access), Next.js's RSC bundler would replace every
 * export of that file — including plain, non-component functions like
 * this one — with a client-reference stub when imported into a Server
 * Component. Calling that stub throws "<name> is not a function" at
 * runtime, in production only (it doesn't affect a page's own client
 * component that imports the same file, which is why this bug only ever
 * hit the product detail page's server render, not the buttons on it).
 */

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
 * Builds the common ProductProps shape from a product-like object. Pure
 * function — safe to call from Server Components and Client Components
 * alike (see the module-level note above for why that distinction
 * matters here).
 */
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
