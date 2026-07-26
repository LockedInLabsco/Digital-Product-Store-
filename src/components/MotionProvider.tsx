'use client'

import { useLayoutEffect } from 'react'
import { usePathname } from 'next/navigation'

function getAnimationLabel(element: Element) {
  const name =
    element.getAttribute('data-debug-animation') ||
    element.getAttribute('data-reveal') ||
    element.tagName.toLowerCase()
  const className = element.getAttribute('class')?.split(' ')[0]

  return className ? `${name} (.${className})` : name
}

export default function MotionProvider() {
  const pathname = usePathname()

  useLayoutEffect(() => {
    const debug = process.env.NODE_ENV === 'development' && pathname === '/'
    const root = document.documentElement
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>('[data-reveal]')
    )
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    if (debug) {
      console.info('[Not4Normal animation debug] Homepage mounted')
      console.info(
        '[Not4Normal animation debug] GSAP initialized: false — GSAP is not installed; the current redesign uses CSS animations and IntersectionObserver.'
      )
      console.info(
        '[Not4Normal animation debug] ScrollTrigger registered: false — no ScrollTrigger instances exist in this implementation.'
      )
      console.info(
        `[Not4Normal animation debug] Reveal system initialized with ${elements.length} elements.`
      )
      elements.forEach((element) => {
        console.info(
          `[Not4Normal animation debug] Major animation created: ${getAnimationLabel(element)}`
        )
      })
    }

    if (prefersReducedMotion) {
      elements.forEach((element) => element.classList.add('is-visible'))
      if (debug) {
        console.info(
          '[Not4Normal animation debug] Reduced motion is enabled; reveal elements were made immediately visible.'
        )
      }
      return
    }

    elements.forEach((element) => {
      const rect = element.getBoundingClientRect()
      if (rect.top < window.innerHeight * 0.96) {
        element.classList.add('is-visible')
      }
    })

    root.classList.add('motion-ready')

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return

          entry.target.classList.add('is-visible')
          if (debug) {
            console.info(
              `[Not4Normal animation debug] Reveal trigger entered: ${getAnimationLabel(entry.target)}`
            )
          }
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
