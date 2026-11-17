interface Props {
  /** Position de la pointe de la fraise, dans le repère de la scène */
  position: [number, number, number]
  /** Diamètre de la fraise en mm */
  diameter: number
}

/** Segments radiaux des cylindres : assez pour être rond sans alourdir la scène */
const RADIAL_SEGMENTS = 24

/**
 * Fraise droite à sa vraie taille : partie coupante puis queue.
 * La pointe est à l'origine du groupe, le reste monte le long de l'axe Z de la machine.
 * Un petit point rouge marque la pointe pour la repérer quand on dézoome.
 *
 * Matériaux peu métalliques : la scène n'a pas de carte d'environnement à refléter, un métal
 * franc y rendrait noir (la lumière ambiante et la lumière directionnelle suffisent à un mat).
 */
export function CutterModel({ position, diameter }: Props) {
  const radius = Math.max(diameter, 0.5) / 2
  const fluteLength = Math.max(12, diameter * 3)
  const shankLength = 25

  return (
    <group position={position}>
      {/* Partie coupante */}
      <mesh position={[0, fluteLength / 2, 0]}>
        <cylinderGeometry args={[radius, radius, fluteLength, RADIAL_SEGMENTS]} />
        <meshStandardMaterial color={0xd5d9de} metalness={0.15} roughness={0.45} />
      </mesh>
      {/* Queue */}
      <mesh position={[0, fluteLength + shankLength / 2, 0]}>
        <cylinderGeometry args={[radius, radius, shankLength, RADIAL_SEGMENTS]} />
        <meshStandardMaterial color={0xaeb4bb} metalness={0.15} roughness={0.5} />
      </mesh>
      {/* Pointe */}
      <mesh>
        <sphereGeometry args={[Math.max(0.4, radius * 0.25), 8, 8]} />
        <meshStandardMaterial color={0xff3333} emissive={0xff0000} emissiveIntensity={0.6} />
      </mesh>
    </group>
  )
}
