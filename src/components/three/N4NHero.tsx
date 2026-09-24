'use client'

import dynamic from 'next/dynamic'
import WebGLFallback from './WebGLFallback'
import { useWebGLSupported } from './useWebGL'

// Code-split: three.js + fiber + drei never ship in the initial bundle,
// and never run at all server-side (WebGL requires a browser).
const N4NScene = dynamic(() => import('./N4NScene'), {
  ssr: false,
  loading: () => <WebGLFallback />,
})

/**
 * Public entry point for the homepage 3D hero object. Renders the real
 * WebGL scene only once the client has confirmed it's actually
 * supported and the visitor hasn't asked for reduced motion; otherwise
 * — including if WebGL is unavailable, disabled, or still loading — the
 * static WebGLFallback renders instead, so the hero always looks
 * finished.
 */
export default function N4NHero({ className = '' }: { className?: string }) {
  const supported = useWebGLSupported()

  if (!supported) {
    return <WebGLFallback className={className} />
  }

  return <N4NScene className={className} />
}
