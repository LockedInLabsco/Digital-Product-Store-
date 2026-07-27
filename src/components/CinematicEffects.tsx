'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import BrandMark from './BrandMark'

type TransitionPhase = 'idle' | 'cover' | 'reveal'

export default function CinematicEffects() {
  const pathname = usePathname()
  const router = useRouter()
  const cursorRef = useRef<HTMLDivElement>(null)
  const cursorLabelRef = useRef<HTMLSpanElement>(null)
  const [phase, setPhase] = useState<TransitionPhase>('reveal')

  useEffect(() => {
    if (pathname.startsWith('/admin')) return

    const debug = process.env.NODE_ENV === 'development' && pathname === '/'
    let frame = 0

    const updateScroll = () => {
      frame = 0
      const scrollY = window.scrollY
      const maxScroll = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        1
      )

      document.documentElement.style.setProperty('--scroll-y', `${scrollY}`)
      document.documentElement.style.setProperty(
        '--scroll-progress',
        `${Math.min(scrollY / maxScroll, 1)}`
      )
    }

    const onScroll = () => {
      if (frame) return
      frame = window.requestAnimationFrame(updateScroll)
    }

    updateScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    if (debug) {
      console.info(
        '[Not4Normal animation debug] Major animation created: hero and editorial scroll parallax.'
      )
    }

    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [pathname])

  useEffect(() => {
    if (pathname.startsWith('/admin')) return

    const debug = process.env.NODE_ENV === 'development' && pathname === '/'
    const finePointer = window.matchMedia(
      '(hover: hover) and (pointer: fine)'
    ).matches
    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    if (!finePointer || reducedMotion) return

    const cursor = cursorRef.current
    const label = cursorLabelRef.current
    if (!cursor || !label) return

    document.body.classList.add('cursor-enabled')
    if (debug) {
      console.info(
        '[Not4Normal animation debug] Major animation created: interactive cinematic cursor.'
      )
    }
    let pointerFrame = 0
    let pointerX = -100
    let pointerY = -100

    const renderCursor = () => {
      pointerFrame = 0
      cursor.style.transform = `translate3d(${pointerX}px, ${pointerY}px, 0)`
    }

    const onPointerMove = (event: PointerEvent) => {
      pointerX = event.clientX
      pointerY = event.clientY
      if (!pointerFrame) {
        pointerFrame = window.requestAnimationFrame(renderCursor)
      }

      const target =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>('[data-cursor]')
          : null
      const cursorLabel = target?.dataset.cursor || ''

      label.textContent = cursorLabel
      cursor.classList.toggle('is-interactive', Boolean(target))
      cursor.classList.toggle('has-label', Boolean(cursorLabel))
    }

    const onPointerDown = () => cursor.classList.add('is-pressed')
    const onPointerUp = () => cursor.classList.remove('is-pressed')
    const onPointerLeave = () => cursor.classList.add('is-hidden')
    const onPointerEnter = () => cursor.classList.remove('is-hidden')

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointerup', onPointerUp)
    document.documentElement.addEventListener('mouseleave', onPointerLeave)
    document.documentElement.addEventListener('mouseenter', onPointerEnter)

    return () => {
      document.body.classList.remove('cursor-enabled')
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerUp)
      document.documentElement.removeEventListener('mouseleave', onPointerLeave)
      document.documentElement.removeEventListener('mouseenter', onPointerEnter)
      if (pointerFrame) window.cancelAnimationFrame(pointerFrame)
    }
  }, [pathname])

  useEffect(() => {
    if (pathname.startsWith('/admin')) return

    const debug = process.env.NODE_ENV === 'development' && pathname === '/'
    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return
      }

      const anchor =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>('a[href]')
          : null

      if (
        !anchor ||
        anchor.target === '_blank' ||
        anchor.hasAttribute('download')
      ) {
        return
      }

      const destination = new URL(anchor.href, window.location.href)

      if (
        destination.origin !== window.location.origin ||
        destination.protocol === 'mailto:' ||
        destination.protocol === 'tel:'
      ) {
        return
      }

      const current = `${window.location.pathname}${window.location.search}`
      const next = `${destination.pathname}${destination.search}`

      if (current === next || destination.hash) return

      event.preventDefault()
      setPhase('cover')

      window.setTimeout(() => {
        router.push(`${destination.pathname}${destination.search}${destination.hash}`)
      }, 240)
    }

    document.addEventListener('click', onClick, true)
    if (debug) {
      console.info(
        '[Not4Normal animation debug] Major animation created: internal page transition.'
      )
    }
    return () => document.removeEventListener('click', onClick, true)
  }, [pathname, router])

  useEffect(() => {
    if (pathname.startsWith('/admin')) return

    setPhase('reveal')
    const timer = window.setTimeout(() => setPhase('idle'), 420)
    return () => window.clearTimeout(timer)
  }, [pathname])

  if (pathname.startsWith('/admin')) return null

  return (
    <>
      <div className="custom-cursor is-hidden" ref={cursorRef} aria-hidden="true">
        <span ref={cursorLabelRef} />
      </div>
      <div
        className={`page-transition page-transition-${phase}`}
        aria-hidden="true"
      >
        <BrandMark className="page-transition-mark" />
      </div>
    </>
  )
}
