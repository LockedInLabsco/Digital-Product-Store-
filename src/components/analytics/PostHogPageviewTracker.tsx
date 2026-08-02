'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { getPostHogInstance, isPostHogInitialized } from '@/src/lib/analytics/posthogClient'

/** Manually fires $pageview on every App Router navigation. Must be
 * mounted inside a Suspense boundary (useSearchParams requirement). */
export default function PostHogPageviewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!pathname) return
    if (pathname.startsWith('/admin')) return
    if (!isPostHogInitialized()) return

    const instance = getPostHogInstance()
    if (!instance) return

    let url = window.location.origin + pathname
    const query = searchParams?.toString()
    if (query) url += `?${query}`

    instance.capture('$pageview', { $current_url: url })
  }, [pathname, searchParams])

  return null
}
