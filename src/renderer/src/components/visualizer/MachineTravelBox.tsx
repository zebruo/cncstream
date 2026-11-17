import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useUIStore } from '../../stores/ui.store'
import { useMachineStore } from '../../stores/machine.store'
import { travelBoundsInWork } from '../../lib/machine-travel'

/**
 * Course de la machine : un pavé en pointillé qui montre la zone atteignable, pour juger d'un
 * coup d'œil si le zéro pièce laisse assez de marge. Les valeurs viennent de GRBL ($130-$132,
 * $23) et sont mémorisées : le pavé reste affiché machine déconnectée.
 *
 * Repère de la scène : X = X pièce, haut = Z pièce, profondeur = −Y pièce.
 */
export function MachineTravelBox() {
  const config = useUIStore((s) => s.machineTravel)
  const show = useUIStore((s) => s.showMachineTravel)
  // Valeurs séparées : l'objet wco est recréé à chaque rapport d'état, ses valeurs changent rarement
  const wcoX = useMachineStore((s) => s.wco.x)
  const wcoY = useMachineStore((s) => s.wco.y)
  const wcoZ = useMachineStore((s) => s.wco.z)
  const linesRef = useRef<THREE.LineSegments>(null)

  const box = useMemo(() => {
    // Course renseignée à la main : tant qu'un axe est à 0, il n'y a pas de volume à dessiner
    if (!config || config.travel.x <= 0 || config.travel.y <= 0 || config.travel.z <= 0) return null
    const { min, max } = travelBoundsInWork(config, { x: wcoX, y: wcoY, z: wcoZ })
    const size: [number, number, number] = [max.x - min.x, max.z - min.z, max.y - min.y]
    const center: [number, number, number] = [(min.x + max.x) / 2, (min.z + max.z) / 2, -(min.y + max.y) / 2]
    return { size, center, edges: new THREE.EdgesGeometry(new THREE.BoxGeometry(...size)) }
  }, [config, wcoX, wcoY, wcoZ])

  // Libère la géométrie remplacée
  useEffect(() => {
    const edges = box?.edges
    return () => edges?.dispose()
  }, [box])

  // Les pointillés demandent les distances le long de chaque segment
  useLayoutEffect(() => {
    linesRef.current?.computeLineDistances()
  }, [box])

  if (!show || !box) return null

  return (
    <lineSegments ref={linesRef} position={box.center} geometry={box.edges}>
      <lineDashedMaterial color="#fab005" dashSize={8} gapSize={5} transparent opacity={0.6} />
    </lineSegments>
  )
}
