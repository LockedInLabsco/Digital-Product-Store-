'use client'

import { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Center, Text3D } from '@react-three/drei'
import * as THREE from 'three'

const FONT_URL = '/fonts/helvetiker_bold.typeface.json'

/**
 * The homepage's 3D centerpiece: the N4N mark rendered as a physical,
 * matte-molded object rather than literal on-screen text. Idle motion is
 * intentionally tiny (a slow breathing rotation); on top of that,
 * desktop pointers nudge the object gently and mobile gets a slow
 * scroll-driven turn instead, since there's no hover there.
 */
export default function N4NMonogram() {
  const groupRef = useRef<THREE.Group>(null)
  const [isCoarsePointer, setIsCoarsePointer] = useState(false)
  const scrollProgress = useRef(0)

  useEffect(() => {
    setIsCoarsePointer(window.matchMedia('(hover: none)').matches)

    if (!window.matchMedia('(hover: none)').matches) return

    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      scrollProgress.current = max > 0 ? window.scrollY / max : 0
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useFrame((state, delta) => {
    const group = groupRef.current
    if (!group) return

    const t = state.clock.getElapsedTime()
    // Constant slow idle rotation + a very small breathing bob — reads
    // as "alive" without ever looking like it's spinning for attention.
    const idleY = t * 0.06
    const idleBob = Math.sin(t * 0.5) * 0.025

    if (isCoarsePointer) {
      const targetY = idleY + scrollProgress.current * 0.9
      group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, targetY, delta * 1.2)
      group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, idleBob, delta * 1.2)
    } else {
      const targetY = idleY + state.pointer.x * 0.28
      const targetX = idleBob - state.pointer.y * 0.16
      group.rotation.y = THREE.MathUtils.lerp(group.rotation.y, targetY, delta * 1.6)
      group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, targetX, delta * 1.6)
    }
  })

  return (
    <group ref={groupRef}>
      <Center>
        <Text3D
          font={FONT_URL}
          size={1.6}
          height={0.42}
          curveSegments={6}
          bevelEnabled
          bevelThickness={0.045}
          bevelSize={0.03}
          bevelSegments={3}
        >
          N4N
          <meshPhysicalMaterial
            color="#141412"
            roughness={0.38}
            metalness={0.22}
            clearcoat={0.25}
            clearcoatRoughness={0.5}
          />
        </Text3D>
      </Center>
    </group>
  )
}
