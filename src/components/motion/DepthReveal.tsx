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

interface DepthRevealProps {
  children: ReactNode
  className?: string
  /** Starting transform/opacity state the element animates FROM as it
   * scrolls into view — this is what gives each section its own
   * character (depth approach, tilt, side entry, ...). */
  from?: DepthVars
  /** CSS perspective (px) on the wrapping element so rotateX/rotateY
   * and translateZ read as real depth instead of a flat skew/scale. */
  perspective?: number
  /** ScrollTrigger start position (when the reveal begins). */
  start?: string
  /** ScrollTrigger end position — only used when `scrub` is set. */
  end?: string
  /** false (default): plays once as the element enters the viewport,
   * like a classic reveal, and reverses if scrolled back above it.
   * true/number: continuously bound to scroll position across
   * [start, end] instead — use for a section that should feel like it
   * is physically moving past the viewer in both directions. */
  scrub?: boolean | number
  /** Animate the direct children with a stagger (seconds) instead of
   * animating this wrapper as a single block — for card grids etc. */
  stagger?: number
  duration?: number
  ease?: string
  delay?: number
}

const DEFAULT_FROM: DepthVars = { y: 70, z: -220, scale: 0.92, opacity: 0 }

/**
 * The core scroll-depth primitive: wraps ordinary HTML content and
 * animates it in from a 3D-perspective offset as it scrolls into view,
 * using GSAP + ScrollTrigger. Never hides content in CSS/SSR — the
 * server-rendered HTML is always the final, fully visible state, so if
 * JS fails to load the page still reads exactly like the original
 * static site (see WHAT-IF-NO-JS behavior). Respects
 * prefers-reduced-motion (no-ops entirely) and dampens travel distance
 * on small viewports via gsap.matchMedia rather than reusing the
 * desktop values at a smaller scale.
 */
export default function DepthReveal({
  children,
  className = '',
  from = DEFAULT_FROM,
  perspective = 1200,
  start = 'top 85%',
  end = 'top 35%',
  scrub = false,
  stagger,
  duration = 0.95,
  ease = 'power4.out',
  delay = 0,
}: DepthRevealProps) {
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

          const targets = stagger ? gsap.utils.toArray<HTMLElement>(el.children) : el
          const intensity = mobile ? MOBILE_INTENSITY : 1

          const fromVars: gsap.TweenVars = {
            x: (from.x ?? 0) * intensity,
            y: (from.y ?? 0) * intensity,
            z: (from.z ?? 0) * intensity,
            rotateX: (from.rotateX ?? 0) * intensity,
            rotateY: (from.rotateY ?? 0) * intensity,
            rotateZ: (from.rotateZ ?? 0) * intensity,
            scale: from.scale !== undefined ? 1 - (1 - from.scale) * intensity : 1,
            opacity: from.opacity ?? 1,
            transformPerspective: perspective,
          }

          const tween = gsap.fromTo(targets, fromVars, {
            x: 0,
            y: 0,
            z: 0,
            rotateX: 0,
            rotateY: 0,
            rotateZ: 0,
            scale: 1,
            opacity: 1,
            duration,
            ease,
            delay,
            stagger: stagger || 0,
            force3D: true,
            onStart: () => gsap.set(targets, { willChange: 'transform, opacity' }),
            onComplete: () => gsap.set(targets, { willChange: 'auto' }),
            scrollTrigger: {
              trigger: el,
              start,
              end: scrub ? end : undefined,
              scrub,
              toggleActions: scrub ? undefined : 'play none none reverse',
            },
          })

          return () => {
            tween.scrollTrigger?.kill()
            tween.kill()
          }
        }
      )
    },
    [start, end, scrub, stagger]
  )

  return (
    <div ref={scopeRef} className={className} style={{ perspective }}>
      {children}
    </div>
  )
}
