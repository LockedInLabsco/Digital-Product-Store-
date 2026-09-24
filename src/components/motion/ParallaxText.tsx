'use client'

import { useEffect, useRef, type ReactNode } from 'react'

interface ParallaxTextProps {
  children: ReactNode
  className?: string
  /** Pixels of vertical travel across the element's scroll range. Small
   * and controlled — this is a depth cue, not a scroll-jacking effect. */
  speed?: number
}

/**
 * Gentle scroll-linked vertical drift for large typography — reads as
 * depth/parallax against a pinned or static 3D object behind it, never
 * hijacks the scroll itself (native scrolling continues exactly as
 * normal; this only nudges the element's own transform in response).
 * No-ops entirely under prefers-reduced-motion.
 */
export default function ParallaxText({ children, className = '', speed = 24 }: ParallaxTextProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let frame: number | null = null

    const update = () => {
      frame = null
      const rect = node.getBoundingClientRect()
      const viewportCenter = window.innerHeight / 2
      const elementCenter = rect.top + rect.height / 2
      const distanceFromCenter = (elementCenter - viewportCenter) / window.innerHeight
      const offset = distanceFromCenter * speed
      node.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0)`
    }

    const onScroll = () => {
      if (frame === null) frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)

    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [speed])

  return (
    <div ref={ref} data-parallax className={`will-change-transform ${className}`}>
      {children}
    </div>
  )
}
