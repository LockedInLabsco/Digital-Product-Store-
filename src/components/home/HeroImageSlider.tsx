'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import type { HeroSlide } from './heroSlides'

const AUTOPLAY_INTERVAL_MS = 4000
const CROSSFADE_MS = 1200
// Kept slightly longer than the autoplay interval so the Ken Burns
// scale is still gently animating right up until the next crossfade.
const SCALE_DURATION_MS = AUTOPLAY_INTERVAL_MS + 1000

interface HeroImageSliderProps {
  /** Pre-filtered by the server to only slides whose file actually exists. */
  slides: HeroSlide[]
  /** Website Media hero image — shown while no slideshow images are uploaded. */
  fallbackImageUrl?: string
  fallbackImageAlt?: string
}

export default function HeroImageSlider({
  slides,
  fallbackImageUrl,
  fallbackImageAlt,
}: HeroImageSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [failedSrcs, setFailedSrcs] = useState<Set<string>>(new Set())
  const [isPaused, setIsPaused] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  const visibleSlides = slides.filter((slide) => !failedSrcs.has(slide.src))

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(query.matches)

    const handleChange = (event: MediaQueryListEvent) =>
      setPrefersReducedMotion(event.matches)

    query.addEventListener('change', handleChange)
    return () => query.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    if (visibleSlides.length <= 1 || isPaused) return

    const interval = window.setInterval(() => {
      setCurrentIndex((index) => index + 1)
    }, AUTOPLAY_INTERVAL_MS)

    return () => window.clearInterval(interval)
  }, [visibleSlides.length, isPaused])

  const handleImageError = (src: string) => {
    setFailedSrcs((previous) => {
      if (previous.has(src)) return previous
      const next = new Set(previous)
      next.add(src)
      return next
    })
  }

  // Every configured slide failed (or none exist yet) — fall back to the
  // existing single Website Media hero image / placeholder mark exactly
  // as before, so the page never breaks.
  if (visibleSlides.length === 0) {
    return fallbackImageUrl ? (
      <div
        className="relative aspect-[4/3] w-full overflow-hidden rounded-sm border border-line/10"
        data-reveal="fade"
      >
        <Image
          src={fallbackImageUrl}
          alt={fallbackImageAlt || 'Not4Normal'}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover"
        />
      </div>
    ) : (
      <div
        className="relative aspect-[4/3] w-full overflow-hidden rounded-sm border border-line/10 bg-gradient-to-br from-offwhite via-charcoal to-ink"
        data-reveal="fade"
        aria-hidden="true"
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-serif text-6xl tracking-tight text-cream/15 sm:text-7xl">
            N4N
          </span>
        </div>
        <div className="absolute bottom-6 left-6 right-6 border-t border-line/10 pt-4">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-cream/40">
            Est. 2026 — Not4Normal
          </p>
        </div>
      </div>
    )
  }

  const activeIndex = currentIndex % visibleSlides.length

  return (
    <div
      className="relative aspect-[4/3] w-full overflow-hidden rounded-sm border border-line/10 bg-charcoal"
      data-reveal="fade"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {visibleSlides.map((slide, index) => {
        const isActive = index === activeIndex

        return (
          <div
            key={slide.src}
            aria-hidden={!isActive}
            className="absolute inset-0"
            style={{
              opacity: isActive ? 1 : 0,
              transition: prefersReducedMotion
                ? 'opacity 200ms linear'
                : `opacity ${CROSSFADE_MS}ms var(--ease)`,
            }}
          >
            <div
              className="h-full w-full"
              style={{
                transform:
                  isActive && !prefersReducedMotion ? 'scale(1.04)' : 'scale(1)',
                transition:
                  isActive && !prefersReducedMotion
                    ? `transform ${SCALE_DURATION_MS}ms ease-out`
                    : 'none',
              }}
            >
              <Image
                src={slide.src}
                alt={slide.alt}
                fill
                priority={index === 0}
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover contrast-[1.05] saturate-[0.9]"
                style={{ objectPosition: slide.objectPosition || 'center' }}
                onError={() => handleImageError(slide.src)}
              />
            </div>
          </div>
        )
      })}

      {/* Dark navy wash + soft blue edge glow so every photo reads as part of the site */}
      <div className="pointer-events-none absolute inset-0 bg-ink/15" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-0 shadow-[inset_0_0_70px_14px_rgb(var(--color-accent-bright)/0.16)]"
        aria-hidden="true"
      />

      {/* Very subtle blueprint grid + points — decorative only, hidden on mobile */}
      <div
        className="pointer-events-none absolute inset-0 hidden opacity-[0.07] sm:block"
        style={{
          backgroundImage:
            'linear-gradient(rgb(var(--color-accent-bright)) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--color-accent-bright)) 1px, transparent 1px)',
          backgroundSize: '42px 42px',
        }}
        aria-hidden="true"
      />
      <div className="pointer-events-none absolute inset-0 hidden sm:block" aria-hidden="true">
        <span className="absolute right-[12%] top-[16%] h-1 w-1 rounded-full bg-gold/50" />
        <span className="absolute left-[10%] top-[62%] h-1 w-1 rounded-full bg-gold/40" />
        <span className="absolute bottom-[20%] right-[22%] h-[3px] w-[3px] rounded-full bg-gold/30" />
      </div>

      {visibleSlides.length > 1 && (
        <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-2">
          {visibleSlides.map((slide, index) => (
            <button
              key={slide.src}
              type="button"
              onClick={() => setCurrentIndex(index)}
              aria-label={`Show slide ${index + 1}: ${slide.alt}`}
              aria-current={index === activeIndex}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index === activeIndex
                  ? 'w-5 bg-gold'
                  : 'w-1.5 bg-cream/30 hover:bg-cream/50'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
