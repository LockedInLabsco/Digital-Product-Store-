'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import type { HeroSliderImage } from '@/src/types/settings'

const AUTOPLAY_INTERVAL_MS = 4000
const CROSSFADE_MS = 1200
// Kept slightly longer than the autoplay interval so the Ken Burns
// scale is still gently animating right up until the next crossfade.
const SCALE_DURATION_MS = AUTOPLAY_INTERVAL_MS + 1000

interface HeroImageSliderProps {
  /** Hero slider images from admin settings (site_settings -> hero_slider_images). */
  images: HeroSliderImage[]
  /** Website Media hero image — shown while no slider images are enabled. */
  fallbackImageUrl?: string
  fallbackImageAlt?: string
}

export default function HeroImageSlider({
  images,
  fallbackImageUrl,
  fallbackImageAlt,
}: HeroImageSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set())
  const [isPaused, setIsPaused] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  const visibleSlides = images.filter(
    (image) => image.enabled && image.url && !failedIds.has(image.id)
  )

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

  const handleImageError = (id: string) => {
    setFailedIds((previous) => {
      if (previous.has(id)) return previous
      const next = new Set(previous)
      next.add(id)
      return next
    })
  }

  // No enabled slider images (or every one of them failed to load) — fall
  // back to the existing single Website Media hero image / placeholder
  // mark exactly as before, so the page never breaks.
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
            key={slide.id}
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
                src={slide.url}
                alt={slide.alt}
                fill
                priority={index === 0}
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover contrast-[1.05] saturate-[0.9]"
                style={{ objectPosition: slide.objectPosition || 'center' }}
                onError={() => handleImageError(slide.id)}
              />
            </div>
          </div>
        )
      })}

      {/* Subtle dark wash + soft edge vignette so every photo reads as part of the site */}
      <div className="pointer-events-none absolute inset-0 bg-ink/10" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-0 shadow-[inset_0_0_50px_10px_rgba(0,0,0,0.35)]"
        aria-hidden="true"
      />

      {visibleSlides.length > 1 && (
        <div className="absolute inset-x-0 bottom-4 flex items-center justify-center gap-2">
          {visibleSlides.map((slide, index) => (
            <button
              key={slide.id}
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
