'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import PathIllustration from '../PathIllustration'
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
        className="relative aspect-[4/3] w-full overflow-hidden rounded-md border border-line"
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
        className="relative aspect-[4/3] w-full overflow-hidden rounded-md border border-line bg-charcoal"
        data-reveal="fade"
        aria-hidden="true"
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <PathIllustration className="h-[70%] w-[80%] -translate-y-4 text-cream" />
          <span className="absolute left-6 top-6 text-sm font-bold tracking-tight text-cream">N4N</span>
        </div>
        <div className="absolute bottom-6 left-6 right-6 border-t border-line pt-4">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-beige">
            Est. 2026 — Not4Normal
          </p>
        </div>
      </div>
    )
  }

  const activeIndex = currentIndex % visibleSlides.length

  return (
    <div
      className="relative aspect-[4/3] w-full overflow-hidden rounded-md border border-line bg-charcoal"
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
                className="object-cover"
                style={{ objectPosition: slide.objectPosition || 'center' }}
                onError={() => handleImageError(slide.id)}
              />
            </div>
          </div>
        )
      })}

      {visibleSlides.length > 1 && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center justify-center gap-1 rounded-md border border-line bg-white p-1">
          {visibleSlides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              onClick={() => setCurrentIndex(index)}
              aria-label={`Show slide ${index + 1}: ${slide.alt}`}
              aria-current={index === activeIndex}
              className={`relative h-8 w-8 rounded-sm transition-colors after:absolute after:inset-x-2 after:top-[15px] after:h-0.5 after:bg-current ${
                index === activeIndex
                  ? 'bg-cream text-white'
                  : 'bg-white text-cream hover:bg-offwhite'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
