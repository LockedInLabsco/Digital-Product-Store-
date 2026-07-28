'use client'

import { useLayoutEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function MotionProvider() {
  const pathname = usePathname()

  useLayoutEffect(() => {
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>('[data-reveal]')
    )
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    if (prefersReducedMotion) {
      elements.forEach((element) => element.classList.add('is-visible'))
      return
    }

    elements.forEach((element) => {
      const rect = element.getBoundingClientRect()
      if (rect.top < window.innerHeight * 0.96) {
        element.classList.add('is-visible')
      }
    })

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.classList.add('is-visible')
          observer.unobserve(entry.target)
        })
      },
      {
        rootMargin: '0px 0px -8% 0px',
        threshold: 0.12,
      }
    )

    elements.forEach((element) => {
      if (!element.classList.contains('is-visible')) {
        observer.observe(element)
      }
    })

    return () => observer.disconnect()
  }, [pathname])

  return null
}
