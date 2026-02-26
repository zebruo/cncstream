import type { GCodeMovement, ToolpathSegment } from '@shared/types/gcode'
import { interpolateArc } from './arc-interpolator'

export function buildToolpath(movements: GCodeMovement[]): ToolpathSegment[] {
  const segments: ToolpathSegment[] = []

  for (const move of movements) {
    if (move.type === 'G0' || move.type === 'G1') {
      segments.push({
        type: move.type === 'G0' ? 'rapid' : 'feed',
        points: [
          [move.from.x, move.from.y, move.from.z],
          [move.to.x, move.to.y, move.to.z]
        ],
        feedRate: move.feedRate,
        lineIndex: move.lineIndex
      })
    } else if (move.type === 'G2' || move.type === 'G3') {
      const arcPoints = interpolateArc(move)
      segments.push({
        type: 'feed',
        points: arcPoints,
        feedRate: move.feedRate,
        lineIndex: move.lineIndex
      })
    }
  }

  return segments
}
