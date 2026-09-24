'use client'

import { useRef, type ReactNode } from 'react'
import gsap from 'gsap'
import { useGsapScroll, MOTION_BREAKPOINTS, MOBILE_INTENSITY } from './scrollMotion'

interface ScrollParallaxProps {
  children: ReactNode
  className?: string
  /** Relative depth speed. 0 = pinned to the viewport (reads as the
   * furthest-back layer). 1 = moves exactly with the page (no
   * parallax — the "normal" layer). >1 = moves faster than scroll
   * (reads as closer to the viewer, e.g. small foreground text).
   * Negative values drift against scroll direction. */
  speed?: number
  /** Max vertical travel in px at speed = 1, over this element's own
   * scroll span. Scaled by `speed` and dampened on mobile. */
  range?: number
}

/**
 * Continuous, scroll-linked vertical drift — not a one-shot reveal.
 * Used to make layered content (a background word, a headline, a small
 * caption; a product image vs. its copy) move at different depth
 * speeds as the page scrolls, which is what reads as real depth
 * without any 3D object existing. Purely transform-based (translateY),
 * scrub-linked to native scroll position — it never intercepts or
 * locks scrolling itself.
 */
export default function ScrollParallax({
  children,
  className = '',
  speed = 0.4,
  range = 120,
}: ScrollParallaxProps) {
  const scopeRef = useRef<HTMLDivElement>(null)

  useGsapScroll(
    scopeRef,
    ({ mm }) => {
      const el = scopeRef.current
      if (!el) return

      mm.add(
        { reduced: MOTION_BREAKPOINTS.reduced, mobile: MOTION_BREAKPOINTS.mobile },
        (context) => {
          const { reduced, mobile } = context.conditions as {
            reduced: boolean
            mobile: boolean
          }
          if (reduced) return

          const intensity = mobile ? MOBILE_INTENSITY : 1
          const offset = range * speed * intensity

          const tween = gsap.fromTo(
            el,
            { y: -offset },
            {
              y: offset,
              ease: 'none',
              force3D: true,
              scrollTrigger: {
                trigger: el,
                start: 'top bottom',
                end: 'bottom top',
                scrub: true,
              },
            }
          )

          return () => {
            tween.scrollTrigger?.kill()
            tween.kill()
          }
        }
      )
    },
    [speed, range]
  )

  return (
    <div ref={scopeRef} className={className}>
      {children}
    </div>
  )
}
