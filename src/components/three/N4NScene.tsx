'use client'

import { Suspense, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import N4NMonogram from './N4NMonogram'
import { useInView } from './useWebGL'

/**
 * Canvas + lighting rig for the homepage hero object. Deliberately lit
 * with plain three.js lights (no HDRI environment map) — a small,
 * reliable, offline-safe "studio" rig rather than a fetched texture, in
 * line with the perf budget (no large assets, no unnecessary network
 * fetches). DPR is capped and the render loop pauses entirely once the
 * canvas scrolls out of view.
 */
export default function N4NScene({ className = '' }: { className?: string }) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inView = useInView(wrapperRef, '15%')

  return (
    <div ref={wrapperRef} className={`scene-fade-in ${className}`}>
      <Canvas
        dpr={[1, 1.75]}
        frameloop={inView ? 'always' : 'never'}
        gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        camera={{ position: [0, 0, 5.4], fov: 32 }}
      >
        <ambientLight intensity={0.55} />
        <directionalLight position={[3, 4, 5]} intensity={1.4} />
        <directionalLight position={[-4, -2, -3]} intensity={0.35} color="#8a8a86" />
        <pointLight position={[0, 2.2, 2]} intensity={0.5} color="#ffffff" />
        <Suspense fallback={null}>
          <N4NMonogram />
        </Suspense>
      </Canvas>
    </div>
  )
}
