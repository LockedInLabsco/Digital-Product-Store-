'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { track } from '@/src/lib/analytics/events'

// A section counts as "engaged" once at least half of it is on screen.
const ENGAGEMENT_VISIBILITY_THRESHOLD = 0.5
const MIN_ENGAGED_SECONDS_TO_REPORT = 1
const OBSERVER_THRESHOLDS = [0, 0.25, 0.5, 0.75, 0.9, 1]

interface SectionState {
  maxRatio: number
  viewedFired: boolean
  engaging: boolean
  engageStartedAt: number | null
  accumulatedMs: number
}

/**
 * Scans for [data-section-id] elements (mirrors MotionProvider's
 * [data-reveal] scan) and reports section_viewed once per section plus
 * an aggregated section_engagement_completed when a section stops
 * being meaningfully visible — never a running stream of events.
 */
export default function SectionEngagementTracker() {
  const pathname = usePathname()

  useEffect(() => {
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>('[data-section-id]')
    )
    if (sections.length === 0) return

    const state = new Map<string, SectionState>()
    sections.forEach((el) => {
      const id = el.dataset.sectionId
      if (!id) return
      state.set(id, {
        maxRatio: 0,
        viewedFired: false,
        engaging: false,
        engageStartedAt: null,
        accumulatedMs: 0,
      })
    })

    let pageVisible = document.visibilityState === 'visible'

    function stopEngaging(s: SectionState) {
      if (s.engaging && s.engageStartedAt !== null) {
        s.accumulatedMs += Date.now() - s.engageStartedAt
      }
      s.engaging = false
      s.engageStartedAt = null
    }

    function startEngaging(s: SectionState) {
      if (!pageVisible || s.engaging) return
      s.engaging = true
      s.engageStartedAt = Date.now()
    }

    function flush(id: string, s: SectionState) {
      stopEngaging(s)
      const seconds = Math.round(s.accumulatedMs / 1000)
      if (seconds >= MIN_ENGAGED_SECONDS_TO_REPORT) {
        track('section_engagement_completed', {
          section_id: id,
          engaged_seconds: seconds,
          maximum_visibility_percentage: Math.round(s.maxRatio * 100),
        })
      }
      s.accumulatedMs = 0
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = (entry.target as HTMLElement).dataset.sectionId
          if (!id) return
          const s = state.get(id)
          if (!s) return

          s.maxRatio = Math.max(s.maxRatio, entry.intersectionRatio)

          if (entry.intersectionRatio > 0 && !s.viewedFired) {
            s.viewedFired = true
            track('section_viewed', { section_id: id })
          }

          if (entry.intersectionRatio >= ENGAGEMENT_VISIBILITY_THRESHOLD) {
            startEngaging(s)
          } else if (s.engaging) {
            flush(id, s)
          }
        })
      },
      { threshold: OBSERVER_THRESHOLDS }
    )

    sections.forEach((el) => observer.observe(el))

    const handleVisibilityChange = () => {
      pageVisible = document.visibilityState === 'visible'
      state.forEach((s) => {
        if (!pageVisible) {
          stopEngaging(s)
        } else if (s.maxRatio >= ENGAGEMENT_VISIBILITY_THRESHOLD) {
          startEngaging(s)
        }
      })
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    const handlePageHide = () => {
      state.forEach((s, id) => flush(id, s))
    }
    window.addEventListener('pagehide', handlePageHide)

    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', handlePageHide)
      state.forEach((s, id) => flush(id, s))
    }
  }, [pathname])

  return null
}
