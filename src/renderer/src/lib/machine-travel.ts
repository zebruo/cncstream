import type { MachineConfig } from '@shared/types/machine'

type Xyz = { x: number; y: number; z: number }

export interface WorkBounds {
  min: Xyz
  max: Xyz
}

/**
 * Zone atteignable par la machine, exprimée dans le repère pièce (celui de la vue 3D).
 *
 * Après un homing, le zéro machine est au point de référence. GRBL fait son homing vers le côté
 * positif par défaut (course de −T à 0 en coordonnées machine) ; un bit à 1 dans `$23` l'inverse
 * (course de 0 à +T). Le repère pièce se déduit du repère machine en retirant le décalage
 * de travail (WCO) : pièce = machine − WCO.
 */
export function travelBoundsInWork(config: MachineConfig, wco: Xyz): WorkBounds {
  const axis = (travel: number, bit: number, offset: number): [number, number] => {
    const homesNegative = (config.homingInvertMask & (1 << bit)) !== 0
    const [machineMin, machineMax] = homesNegative ? [0, travel] : [-travel, 0]
    return [machineMin - offset, machineMax - offset]
  }
  const [minX, maxX] = axis(config.travel.x, 0, wco.x)
  const [minY, maxY] = axis(config.travel.y, 1, wco.y)
  const [minZ, maxZ] = axis(config.travel.z, 2, wco.z)
  return { min: { x: minX, y: minY, z: minZ }, max: { x: maxX, y: maxY, z: maxZ } }
}
