/**
 * Shared attribution shapes used across the client attribution utility,
 * the free-download route, the Paddle checkout custom data, and the
 * Paddle webhook. Keeping one definition avoids the client and server
 * silently drifting apart on field names.
 */

export interface TouchAttribution {
  source: string | null
  medium: string | null
  campaign: string | null
  content: string | null
  term: string | null
}

export interface AttributionSnapshot {
  firstTouch: TouchAttribution
  lastTouch: TouchAttribution
  referrerDomain: string | null
  landingPage: string | null
  /** First-visit timestamp, ISO string. */
  firstVisitAt: string | null
}

export const EMPTY_TOUCH: TouchAttribution = {
  source: null,
  medium: null,
  campaign: null,
  content: null,
  term: null,
}

/** Flat shape used for Paddle custom_data and the free-download API body. */
export interface AttributionPayload {
  first_touch_source: string | null
  first_touch_medium: string | null
  first_touch_campaign: string | null
  first_touch_content: string | null
  last_touch_source: string | null
  last_touch_medium: string | null
  last_touch_campaign: string | null
  referrer_domain: string | null
  landing_page: string | null
}

export function toAttributionPayload(snapshot: AttributionSnapshot): AttributionPayload {
  return {
    first_touch_source: snapshot.firstTouch.source,
    first_touch_medium: snapshot.firstTouch.medium,
    first_touch_campaign: snapshot.firstTouch.campaign,
    first_touch_content: snapshot.firstTouch.content,
    last_touch_source: snapshot.lastTouch.source,
    last_touch_medium: snapshot.lastTouch.medium,
    last_touch_campaign: snapshot.lastTouch.campaign,
    referrer_domain: snapshot.referrerDomain,
    landing_page: snapshot.landingPage,
  }
}
