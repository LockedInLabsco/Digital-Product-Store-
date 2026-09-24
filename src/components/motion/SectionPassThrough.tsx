'use client'

import { useRef, type ReactNode } from 'react'
import gsap from 'gsap'
import { useGsapScroll, MOTION_BREAKPOINTS, MOBILE_INTENSITY } from './scrollMotion'

interface DepthVars {
  x?: number
  y?: number
  z?: number
  rotateX?: number
  rotateY?: number
  rotateZ?: number
  scale?: number
  opacity?: number
}

interface SectionPassThroughProps {
  children: ReactNode
  className?: string
  /** State animated FROM as the section enters the viewport. */
  from?: DepthVars
  /** State animated TO as the section leaves the viewport — this is
   * what creates the "the user travelled past it" sensation. */
  to?: DepthVars
  perspective?: number
  /** Skip the entrance phase entirely and only animate the exit — for
   * a section that's already visible at the top of the page on load
   * (the hero), which must render fully settled on first paint rather
   * than mid-entrance. */
  skipEntrance?: boolean
}

const DEFAULT_FROM: DepthVars = { y: 50, z: -150, opacity: 0, scale: 0.96 }
const DEFAULT_TO: DepthVars = { y: -60, z: -140, opacity: 0.3, scale: 0.94, rotateX: 6 }

/**
 * A single scrubbed timeline spanning a section's entire time in the
 * viewport (top bottom -> bottom top): enters from `from`, settles flat
 * and fully readable through the middle of its scroll life, then eases
 * toward `to` as it leaves — the "previous section recedes as the next
 * one takes over" moment. Reserved for the one or two biggest
 * transition beats on a page (the hero in particular); everything else
 * should use the simpler one-shot DepthReveal.
 */
export default function SectionPassThrough({
  children,
  className = '',
  from = DEFAULT_FROM,
  to = DEFAULT_TO,
  perspective = 1200,
  skipEntrance = false,
}: SectionPassThroughProps) {
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
          const scale = (v: number | undefined) =>
            v !== undefined ? 1 - (1 - v) * intensity : 1
          const scaled = (v: number | undefined) => (v ?? 0) * intensity

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: el,
              start: skipEntrance ? 'top top' : 'top bottom',
              end: 'bottom top',
              scrub: true,
            },
          })

          gsap.set(el, { transformPerspective: perspective, force3D: true })

          if (!skipEntrance) {
            tl.fromTo(
              el,
              {
                x: scaled(from.x),
                y: scaled(from.y),
                z: scaled(from.z),
                rotateX: scaled(from.rotateX),
                rotateY: scaled(from.rotateY),
                rotateZ: scaled(from.rotateZ),
                scale: scale(from.scale),
                opacity: from.opacity ?? 1,
              },
              { x: 0, y: 0, z: 0, rotateX: 0, rotateY: 0, rotateZ: 0, scale: 1, opacity: 1, duration: 0.35, ease: 'none' }
            )
          }

          tl.to(el, { duration: skipEntrance ? 0.6 : 0.3, ease: 'none' }) // hold flat and fully readable
            .to(el, {
              x: scaled(to.x),
              y: scaled(to.y),
              z: scaled(to.z),
              rotateX: scaled(to.rotateX),
              rotateY: scaled(to.rotateY),
              rotateZ: scaled(to.rotateZ),
              scale: scale(to.scale),
              opacity: to.opacity ?? 1,
              duration: skipEntrance ? 0.4 : 0.35,
              ease: 'none',
            })

          return () => {
            tl.scrollTrigger?.kill()
            tl.kill()
          }
        }
      )
    },
    [skipEntrance]
  )

  return (
    <div ref={scopeRef} className={className} style={{ perspective }}>
      {children}
    </div>
  )
}
