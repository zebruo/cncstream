interface Props {
  /** Position de la pointe de la fraise, dans le repère de la scène */
  position: [number, number, number]
  /** Diamètre de la fraise en mm */
  diameter: number
}

/** Segments radiaux des cylindres : assez pour être rond sans alourdir la scène */
const RADIAL_SEGMENTS = 24

/**
 * Fraise droite à sa vraie taille : partie coupante, queue, puis écrou de la pince de la broche.
 * La pointe est à l'origine du groupe, le reste monte le long de l'axe Z de la machine.
 * Un petit point rouge marque la pointe pour la repérer quand on dézoome.
 */
export function CutterModel({ position, diameter }: Props) {
  const radius = Math.max(diameter, 0.5) / 2
  const fluteLength = Math.max(12, diameter * 3)
  const shankLength = 15
  const nutRadius = Math.max(9, radius + 2)
  const nutLength = 14

  return (
    <group position={position}>
      {/* Partie coupante */}
      <mesh position={[0, fluteLength / 2, 0]}>
        <cylinderGeometry args={[radius, radius, fluteLength, RADIAL_SEGMENTS]} />
        <meshStandardMaterial color={0xc8ccd2} metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Queue */}
      <mesh position={[0, fluteLength + shankLength / 2, 0]}>
        <cylinderGeometry args={[radius, radius, shankLength, RADIAL_SEGMENTS]} />
        <meshStandardMaterial color={0x9aa0a6} metalness={0.7} roughness={0.4} />
      </mesh>
      {/* Écrou de la pince */}
      <mesh position={[0, fluteLength + shankLength + nutLength / 2, 0]}>
        <cylinderGeometry args={[nutRadius, nutRadius, nutLength, RADIAL_SEGMENTS]} />
        <meshStandardMaterial color={0x3a3d42} metalness={0.5} roughness={0.6} />
      </mesh>
      {/* Pointe */}
      <mesh>
        <sphereGeometry args={[Math.max(0.4, radius * 0.25), 8, 8]} />
        <meshStandardMaterial color={0xff3333} emissive={0xff0000} emissiveIntensity={0.6} />
      </mesh>
    </group>
  )
}
