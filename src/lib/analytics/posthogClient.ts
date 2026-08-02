'use client'

import type { PostHog } from 'posthog-js'

// posthog-js (~80KB) is only downloaded once a visitor actually accepts
// analytics consent — dynamic import keeps it out of the initial page
// bundle entirely for everyone who hasn't (yet) consented.
let posthogInstance: PostHog | null = null
let initialized = false
let initializing = false

export function isPostHogConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY)
}

/**
 * Initializes PostHog once. Must only be called after the visitor has
 * accepted analytics consent, and never on /admin pages.
 */
export async function initPostHog(): Promise<void> {
  if (initialized || initializing || typeof window === 'undefined') return

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'
  if (!key) return

  initializing = true
  try {
    const { default: posthog } = await import('posthog-js')

    posthog.init(key, {
      api_host: host,
      // Manual pageview capture keeps this correct across Next.js App
      // Router client-side navigations (see PostHogPageviewTracker).
      capture_pageview: false,
      capture_pageleave: true,
      autocapture: true,
      persistence: 'localStorage+cookie',
      session_recording: {
        // Safest default: mask every input's value rather than an
        // allowlist. There is no card/payment field on this site —
        // Paddle Checkout runs inside Paddle's own cross-origin hosted
        // overlay, which the browser already prevents this page's
        // recorder from reading.
        maskAllInputs: true,
        maskTextSelector: '[data-ph-mask]',
      },
      before_send: (event) => {
        if (!event) return event
        // Defense in depth: never let an admin page reach PostHog even
        // if something calls capture() before the pathname guard runs.
        if (window.location.pathname.startsWith('/admin')) return null
        return event
      },
    })

    posthogInstance = posthog
    initialized = true
  } finally {
    initializing = false
  }
}

export function isPostHogInitialized(): boolean {
  return initialized
}

export function getPostHogInstance(): PostHog | null {
  return posthogInstance
}

export function pauseAnalytics(): void {
  posthogInstance?.opt_out_capturing()
}

export function resumeAnalytics(): void {
  posthogInstance?.opt_in_capturing()
}
