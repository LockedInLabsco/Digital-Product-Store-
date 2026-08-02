'use client'

import { AttributionSnapshot, TouchAttribution, EMPTY_TOUCH } from '@/src/types/attribution'

const FIRST_TOUCH_COOKIE = 'n4n_first_touch'
const LAST_TOUCH_COOKIE = 'n4n_last_touch'
const LANDING_PAGE_COOKIE = 'n4n_landing_page'
const REFERRER_DOMAIN_COOKIE = 'n4n_referrer_domain'
const FIRST_VISIT_COOKIE = 'n4n_first_visit_at'
const ATTRIBUTION_MAX_AGE_DAYS = 90

function setCookie(name: string, value: string, maxAgeDays: number) {
  if (typeof document === 'undefined') return
  const maxAge = maxAgeDays * 24 * 60 * 60
  document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; SameSite=Lax`
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function readUtmFromLocation(): TouchAttribution | null {
  const params = new URLSearchParams(window.location.search)
  const source = params.get('utm_source')
  const medium = params.get('utm_medium')
  const campaign = params.get('utm_campaign')
  const content = params.get('utm_content')
  const term = params.get('utm_term')

  if (!source && !medium && !campaign && !content && !term) return null

  return { source, medium, campaign, content, term }
}

function readReferrerDomain(): string | null {
  if (typeof document === 'undefined' || !document.referrer) return null
  try {
    const hostname = new URL(document.referrer).hostname
    if (hostname === window.location.hostname) return null // internal navigation
    return hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

function referralTouch(): TouchAttribution | null {
  const domain = readReferrerDomain()
  if (!domain) return null

  return { source: domain, medium: 'referral', campaign: null, content: null, term: null }
}

/**
 * Captures/refreshes attribution on page load. Safe to call on every
 * page view — first-touch, landing page, referrer, and first-visit
 * timestamp are only ever written once per visitor.
 */
export function captureAttribution(): void {
  if (typeof window === 'undefined') return

  const utmTouch = readUtmFromLocation()
  const newTouch = utmTouch || referralTouch()

  if (!getCookie(FIRST_TOUCH_COOKIE)) {
    setCookie(FIRST_TOUCH_COOKIE, JSON.stringify(newTouch || EMPTY_TOUCH), ATTRIBUTION_MAX_AGE_DAYS)
    setCookie(FIRST_VISIT_COOKIE, new Date().toISOString(), ATTRIBUTION_MAX_AGE_DAYS)
    setCookie(LANDING_PAGE_COOKIE, window.location.pathname, ATTRIBUTION_MAX_AGE_DAYS)
    setCookie(REFERRER_DOMAIN_COOKIE, readReferrerDomain() || '', ATTRIBUTION_MAX_AGE_DAYS)
  }

  if (newTouch) {
    setCookie(LAST_TOUCH_COOKIE, JSON.stringify(newTouch), ATTRIBUTION_MAX_AGE_DAYS)
  } else if (!getCookie(LAST_TOUCH_COOKIE)) {
    setCookie(LAST_TOUCH_COOKIE, JSON.stringify(EMPTY_TOUCH), ATTRIBUTION_MAX_AGE_DAYS)
  }
}

function parseTouch(raw: string | null): TouchAttribution {
  if (!raw) return EMPTY_TOUCH
  try {
    const parsed = JSON.parse(raw)
    return {
      source: parsed.source ?? null,
      medium: parsed.medium ?? null,
      campaign: parsed.campaign ?? null,
      content: parsed.content ?? null,
      term: parsed.term ?? null,
    }
  } catch {
    return EMPTY_TOUCH
  }
}

export function getAttributionSnapshot(): AttributionSnapshot {
  return {
    firstTouch: parseTouch(getCookie(FIRST_TOUCH_COOKIE)),
    lastTouch: parseTouch(getCookie(LAST_TOUCH_COOKIE)),
    referrerDomain: getCookie(REFERRER_DOMAIN_COOKIE) || null,
    landingPage: getCookie(LANDING_PAGE_COOKIE),
    firstVisitAt: getCookie(FIRST_VISIT_COOKIE),
  }
}

export function getDeviceCategory(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof navigator === 'undefined') return 'desktop'
  const ua = navigator.userAgent
  if (/tablet|ipad/i.test(ua)) return 'tablet'
  if (/mobile|iphone|android/i.test(ua)) return 'mobile'
  return 'desktop'
}
