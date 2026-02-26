import type { GCodeMovement } from '@shared/types/gcode'

const ARC_RESOLUTION_MM = 1

export function interpolateArc(move: GCodeMovement): [number, number, number][] {
  const { from, to, i = 0, j = 0 } = move
  const isClockwise = move.type === 'G2'

  const centerX = from.x + i
  const centerY = from.y + j

  const startAngle = Math.atan2(from.y - centerY, from.x - centerX)
  const endAngle = Math.atan2(to.y - centerY, to.x - centerX)
  const radius = Math.sqrt(i * i + j * j)

  if (radius < 0.001) {
    return [
      [from.x, from.y, from.z],
      [to.x, to.y, to.z]
    ]
  }

  let angularTravel = endAngle - startAngle

  if (isClockwise) {
    if (angularTravel >= 0) angularTravel -= 2 * Math.PI
  } else {
    if (angularTravel <= 0) angularTravel += 2 * Math.PI
  }

  // Full circle detection
  if (Math.abs(from.x - to.x) < 0.001 && Math.abs(from.y - to.y) < 0.001) {
    angularTravel = isClockwise ? -2 * Math.PI : 2 * Math.PI
  }

  const arcLength = Math.abs(angularTravel * radius)
  const numSegments = Math.max(Math.ceil(arcLength / ARC_RESOLUTION_MM), 1)

  const points: [number, number, number][] = [[from.x, from.y, from.z]]

  for (let seg = 1; seg <= numSegments; seg++) {
    const t = seg / numSegments
    const angle = startAngle + angularTravel * t
    const x = centerX + radius * Math.cos(angle)
    const y = centerY + radius * Math.sin(angle)
    const z = from.z + (to.z - from.z) * t
    points.push([x, y, z])
  }

  return points
}
