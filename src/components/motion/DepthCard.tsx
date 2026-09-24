'use client'

import { useRef, type ReactNode } from 'react'

interface DepthCardProps {
  children: ReactNode
  className?: string
  /** Maximum tilt in degrees. Kept small — "expensive, not gimmicky". */
  maxTilt?: number
  /** Optional static vertical offset (e.g. "1rem", "-1rem") baked into
   * every transform this component sets, so a layout stagger (one card
   * shifted up, another down) survives pointer interaction instead of
   * being wiped out by the tilt transform on hover/leave. Prefer this
   * over a Tailwind translate-y class on the same element. */
  baseTranslateY?: string
}

/**
 * Wraps its children in a subtle pointer-driven 3D tilt — cards feel
 * like physical objects with weight rather than flat images. Desktop
 * (hover-capable) pointers only; touch devices get no tilt, since it
 * has no meaningful equivalent there and must never block a tap.
 * Respects prefers-reduced-motion via the CSS in globals.css
 * ([data-tilt] transform is neutralized there).
 */
export default function DepthCard({ children, className = '', maxTilt = 6, baseTranslateY }: DepthCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const frame = useRef<number | null>(null)
  const baseTransform = baseTranslateY ? `translateY(${baseTranslateY})` : ''

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse') return
    const node = ref.current
    if (!node) return

    const rect = node.getBoundingClientRect()
    const px = (event.clientX - rect.left) / rect.width - 0.5
    const py = (event.clientY - rect.top) / rect.height - 0.5

    if (frame.current) cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      node.style.transform = `${baseTransform} perspective(900px) rotateX(${(-py * maxTilt).toFixed(2)}deg) rotateY(${(px * maxTilt).toFixed(2)}deg) translateZ(0)`
    })
  }

  const handlePointerLeave = () => {
    const node = ref.current
    if (!node) return
    if (frame.current) cancelAnimationFrame(frame.current)
    node.style.transform = `${baseTransform} perspective(900px) rotateX(0deg) rotateY(0deg) translateZ(0)`
  }

  return (
    <div
      ref={ref}
      data-tilt
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={baseTransform ? { transform: baseTransform } : undefined}
      className={`preserve-3d transition-transform duration-300 ease-out will-change-transform ${className}`}
    >
      {children}
    </div>
  )
}
