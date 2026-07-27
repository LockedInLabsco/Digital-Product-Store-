'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import BrandMark from './BrandMark'

type TransitionPhase = 'idle' | 'cover' | 'reveal'

export default function CinematicEffects() {
  const pathname = usePathname()
  const router = useRouter()
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
    <div
      className={`page-transition page-transition-${phase}`}
      aria-hidden="true"
    >
      <BrandMark className="page-transition-mark" />
    </div>
  )
}
