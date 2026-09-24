'use client'

import { useRef, type ReactNode } from 'react'
import gsap from 'gsap'
import { useGsapScroll, MOTION_BREAKPOINTS } from './scrollMotion'

interface PinnedSceneProps {
  /** The foreground content that gets the dramatic perspective
   * entrance (e.g. the quote) — this is what `innerRef` animates. */
  children: ReactNode
  /** Rendered inside the same pinned section but OUTSIDE the animated
   * inner wrapper, so it stays put (e.g. a background image with its
   * own independent ScrollParallax) instead of tilting/scaling with
   * the foreground text. */
  background?: ReactNode
  className?: string
  id?: string
  /** Mirrors data-section-id for analytics — must stay on the actual
   * rendered <section>, not get lost behind the pin wrapper. */
  dataSectionId?: string
  /** Extra scroll distance the section stays pinned for, as a percent
   * of viewport height. Kept modest on purpose — "avoid overly long
   * pinned sections". */
  distanceVh?: number
}

/**
 * The single biggest "how is this moving like that" beat on the page:
 * pins the section in place for a controlled scroll distance while an
 * inner timeline plays (arrive with perspective → settle → a very
 * slight continued push), then releases into normal scrolling. This is
 * reserved for exactly one section — see "use pinning sparingly" — the
 * rest of the page uses DepthReveal/ScrollParallax instead.
 *
 * On mobile and under prefers-reduced-motion, pinning is skipped
 * entirely (it fights mobile browsers' address-bar resize and isn't
 * worth the complexity there) in favor of a plain, cheap fade/rise.
 */
export default function PinnedScene({
  children,
  background,
  className = '',
  id,
  dataSectionId,
  distanceVh = 70,
}: PinnedSceneProps) {
  const scopeRef = useRef<HTMLElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)

  useGsapScroll(
    scopeRef,
    ({ mm }) => {
      const section = scopeRef.current
      const inner = innerRef.current
      if (!section || !inner) return

      mm.add(
        { reduced: MOTION_BREAKPOINTS.reduced, mobile: MOTION_BREAKPOINTS.mobile },
        (context) => {
          const { reduced, mobile } = context.conditions as {
            reduced: boolean
            mobile: boolean
          }

          if (reduced || mobile) {
            const tween = gsap.fromTo(
              inner,
              { y: 36, opacity: 0 },
              {
                y: 0,
                opacity: 1,
                duration: 0.9,
                ease: 'power3.out',
                scrollTrigger: {
                  trigger: section,
                  start: 'top 80%',
                  toggleActions: 'play none none reverse',
                },
              }
            )
            return () => {
              tween.scrollTrigger?.kill()
              tween.kill()
            }
          }

          gsap.set(inner, { transformPerspective: 1300 })

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: section,
              start: 'top top',
              end: () => `+=${window.innerHeight * (distanceVh / 100)}`,
              scrub: true,
              pin: true,
              anticipatePin: 1,
              invalidateOnRefresh: true,
            },
          })

          tl.fromTo(
            inner,
            { y: 100, z: -280, rotateX: 14, scale: 0.85, opacity: 0 },
            { y: 0, z: 0, rotateX: 0, scale: 1, opacity: 1, ease: 'power2.out', duration: 0.55, force3D: true }
          ).to(inner, { scale: 1.035, duration: 0.45, ease: 'power1.inOut' })

          return () => {
            tl.scrollTrigger?.kill()
            tl.kill()
          }
        }
      )
    },
    [distanceVh]
  )

  return (
    <section id={id} data-section-id={dataSectionId} ref={scopeRef} className={className}>
      {background}
      <div ref={innerRef}>{children}</div>
    </section>
  )
}
