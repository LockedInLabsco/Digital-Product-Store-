'use client'

import { useEffect, useState } from 'react'

/**
 * Detects whether it's safe to mount a WebGL/three.js scene: WebGL must
 * actually be available (some browsers/devices/locked-down environments
 * disable it) and the visitor must not have asked for reduced motion.
 * Every 3D hero/visual in the app gates on this and renders
 * WebGLFallback instead when it's false — the site must never depend on
 * WebGL to be usable. Starts `false` (server-safe) and flips true only
 * after the client confirms support, so SSR/first paint never assumes a
 * capability it hasn't checked yet.
 */
export function useWebGLSupported(): boolean {
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    if (prefersReducedMotion) {
      setSupported(false)
      return
    }

    try {
      const canvas = document.createElement('canvas')
      const gl =
        canvas.getContext('webgl2') ||
        canvas.getContext('webgl') ||
        canvas.getContext('experimental-webgl')
      setSupported(Boolean(gl))
    } catch {
      setSupported(false)
    }
  }, [])

  return supported
}

/** True once the element has scrolled into (or near) the viewport at
 * least once — used to defer mounting heavy 3D scenes until needed and
 * to pause their render loop once scrolled far away. */
export function useInView<T extends HTMLElement>(
  ref: React.RefObject<T>,
  rootMargin = '200px'
) {
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [ref, rootMargin])

  return inView
}
