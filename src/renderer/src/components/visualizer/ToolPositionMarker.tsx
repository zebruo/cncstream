import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'

interface Props {
  position: [number, number, number]
}

export function ToolPositionMarker({ position }: Props) {
  const meshRef = useRef<Mesh>(null)

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const scale = 1 + 0.15 * Math.sin(clock.getElapsedTime() * 3)
      meshRef.current.scale.setScalar(scale)
    }
  })

  return (
    <group position={position}>
      {/* Cone pointing down (tool tip) */}
      <mesh ref={meshRef} rotation={[Math.PI, 0, 0]} position={[0, 2, 0]}>
        <coneGeometry args={[1.5, 4, 8]} />
        <meshStandardMaterial color={0xff3333} emissive={0xff0000} emissiveIntensity={0.3} />
      </mesh>
      {/* Small sphere at tool point */}
      <mesh>
        <sphereGeometry args={[0.5, 8, 8]} />
        <meshStandardMaterial color={0xff3333} emissive={0xff0000} emissiveIntensity={0.5} />
      </mesh>
    </group>
  )
}