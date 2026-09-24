'use client'

import { useLayoutEffect, useRef, type RefObject } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

let registered = false

/** Registers the ScrollTrigger plugin exactly once, client-side only. */
function ensureRegistered() {
  if (registered || typeof window === 'undefined') return
  gsap.registerPlugin(ScrollTrigger)
  registered = true
}

/**
 * Runs `setup` inside a gsap.context() scoped to `scopeRef`, with the
 * plugin registered first. The context is reverted (killing every
 * tween/ScrollTrigger it created) on unmount and on every dependency
 * change, which is what keeps ScrollTrigger instances from leaking
 * across client-side navigations between pages — see gsap.context()
 * docs. Every scroll-motion component in this app should go through
 * this hook rather than calling gsap directly, so cleanup is uniform.
 */
export function useGsapScroll(
  scopeRef: RefObject<HTMLElement>,
  setup: (context: { mm: gsap.MatchMedia }) => void,
  deps: unknown[] = []
) {
  const setupRef = useRef(setup)
  setupRef.current = setup

  useLayoutEffect(() => {
    ensureRegistered()
    if (!scopeRef.current) return

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia()
      setupRef.current({ mm })
    }, scopeRef)

    return () => ctx.revert()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

/** Breakpoint strings for gsap.matchMedia(), shared so every motion
 * component treats "mobile" and "reduced motion" the same way. */
export const MOTION_BREAKPOINTS = {
  reduced: '(prefers-reduced-motion: reduce)',
  mobile: '(max-width: 767px)',
  desktop: '(min-width: 768px)',
} as const

/** Scales depth/rotation intensity down on small viewports — same
 * visual idea, much less travel, per the "treat mobile as its own
 * composition" requirement rather than just shrinking the desktop
 * effect verbatim. */
export const MOBILE_INTENSITY = 0.4
