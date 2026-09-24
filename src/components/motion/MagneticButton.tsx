'use client'

import { useRef, type ReactNode } from 'react'

interface MagneticButtonProps {
  children: ReactNode
  className?: string
  /** Maximum pull toward the pointer, in pixels. Kept small on purpose. */
  strength?: number
}

/**
 * Subtle magnetic pull toward the cursor for large CTAs — the element
 * nudges a few pixels toward the pointer while it's nearby, then eases
 * back. Desktop mouse only; a no-op wrapper on touch. Does not
 * intercept clicks or change hit-testing, so it's safe to wrap any
 * interactive element (including analytics-tracked links/buttons)
 * without changing their behavior.
 */
export default function MagneticButton({ children, className = '', strength = 14 }: MagneticButtonProps) {
  const ref = useRef<HTMLDivElement>(null)
  const frame = useRef<number | null>(null)

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse') return
    const node = ref.current
    if (!node) return

    const rect = node.getBoundingClientRect()
    const x = (event.clientX - rect.left - rect.width / 2) / (rect.width / 2)
    const y = (event.clientY - rect.top - rect.height / 2) / (rect.height / 2)

    if (frame.current) cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      node.style.transform = `translate3d(${(x * strength).toFixed(1)}px, ${(y * strength).toFixed(1)}px, 0)`
    })
  }

  const handlePointerLeave = () => {
    const node = ref.current
    if (!node) return
    if (frame.current) cancelAnimationFrame(frame.current)
    node.style.transform = 'translate3d(0, 0, 0)'
  }

  return (
    <div
      ref={ref}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={`transition-transform duration-200 ease-out will-change-transform ${className || 'inline-block'}`}
    >
      {children}
    </div>
  )
}
