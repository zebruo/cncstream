import type { ParsedGCodeFile, FileInsight } from '@shared/types/gcode'

const RAPID_ESTIMATE_FEED = 5000 // mm/min

export function analyzeGCode(parsed: ParsedGCodeFile): FileInsight {
  let minFeed = Infinity
  let maxFeed = 0
  let minSpindle = Infinity
  let maxSpindle = 0
  const tools = new Set<number>()
  let totalTimeSeconds = 0

  const bbox = {
    min: { x: Infinity, y: Infinity, z: Infinity },
    max: { x: -Infinity, y: -Infinity, z: -Infinity }
  }

  // Track Z values reached during rapid moves to find retract height
  const rapidZCounts = new Map<number, number>()

  for (const move of parsed.movements) {
    for (const pt of [move.from, move.to]) {
      bbox.min.x = Math.min(bbox.min.x, pt.x)
      bbox.min.y = Math.min(bbox.min.y, pt.y)
      bbox.min.z = Math.min(bbox.min.z, pt.z)
      bbox.max.x = Math.max(bbox.max.x, pt.x)
      bbox.max.y = Math.max(bbox.max.y, pt.y)
      bbox.max.z = Math.max(bbox.max.z, pt.z)
    }

    // Count Z destinations of rapid moves (G0) to find safe Z
    if (move.type === 'G0' && move.to.z > move.from.z) {
      const z = Math.round(move.to.z * 1000) / 1000 // avoid float rounding
      rapidZCounts.set(z, (rapidZCounts.get(z) || 0) + 1)
    }

    if (move.type !== 'G0' && move.feedRate > 0) {
      minFeed = Math.min(minFeed, move.feedRate)
      maxFeed = Math.max(maxFeed, move.feedRate)
    }

    if (move.spindleSpeed > 0) {
      minSpindle = Math.min(minSpindle, move.spindleSpeed)
      maxSpindle = Math.max(maxSpindle, move.spindleSpeed)
    }

    const dist = Math.sqrt(
      (move.to.x - move.from.x) ** 2 +
      (move.to.y - move.from.y) ** 2 +
      (move.to.z - move.from.z) ** 2
    )
    const feedMmPerSec = (move.type === 'G0' ? RAPID_ESTIMATE_FEED : move.feedRate) / 60
    if (feedMmPerSec > 0) {
      totalTimeSeconds += dist / feedMmPerSec
    }
  }

  // Extract tool numbers and try to parse tool info from comments
  // Common CAM comment formats:
  //   Fusion 360:  (T1  D=6. CR=0. - ZMIN=-5. - flat end mill)
  //   VCarve:      (Tool 1: 6.0mm End Mill)
  //   Generic:     ; T1 6mm flat endmill
  const toolInfoMap = new Map<number, { diameter?: number; name?: string }>()

  for (const line of parsed.lines) {
    if (line.params.T !== undefined) {
      tools.add(line.params.T)
    }

    if (line.isComment && line.raw.length > 0) {
      const text = line.raw

      // Match "T<number>" in comment + try to extract diameter and name
      const toolMatch = text.match(/\bT(\d+)\b/i)
      if (toolMatch) {
        const tNum = parseInt(toolMatch[1])
        tools.add(tNum)
        const existing = toolInfoMap.get(tNum) || {}

        // Look for D=<number> (Fusion 360 style)
        const dMatch = text.match(/\bD\s*=\s*(\d+\.?\d*)/i)
        if (dMatch) existing.diameter = parseFloat(dMatch[1])

        // Look for <number>mm or <number> mm
        if (!existing.diameter) {
          const mmMatch = text.match(/(\d+\.?\d*)\s*mm/i)
          if (mmMatch) existing.diameter = parseFloat(mmMatch[1])
        }

        // Extract description: text after the last " - " separator (Fusion style)
        const descMatch = text.match(/-\s+([a-zA-Z][\w\s]+?)\s*[)]*\s*$/)
        if (descMatch) existing.name = descMatch[1].trim()

        // Or "Tool N: <desc>" style
        if (!existing.name) {
          const nameMatch = text.match(/Tool\s*\d+\s*:\s*(.+)/i)
          if (nameMatch) existing.name = nameMatch[1].replace(/[()]/g, '').trim()
        }

        toolInfoMap.set(tNum, existing)
      }
    }
  }

  const safeVal = (v: number, fallback: number) => (isFinite(v) ? v : fallback)

  return {
    lineCount: parsed.lines.length,
    movementCount: parsed.movements.length,
    feedRange: { min: safeVal(minFeed, 0), max: safeVal(maxFeed, 0) },
    spindleRange: { min: safeVal(minSpindle, 0), max: safeVal(maxSpindle, 0) },
    toolsUsed: Array.from(tools).sort((a, b) => a - b),
    toolInfo: Array.from(tools)
      .sort((a, b) => a - b)
      .map((n) => ({ number: n, ...toolInfoMap.get(n) })),
    estimatedTimeSeconds: totalTimeSeconds,
    boundingBox: {
      min: { x: safeVal(bbox.min.x, 0), y: safeVal(bbox.min.y, 0), z: safeVal(bbox.min.z, 0) },
      max: { x: safeVal(bbox.max.x, 0), y: safeVal(bbox.max.y, 0), z: safeVal(bbox.max.z, 0) }
    },
    dimensions: {
      x: safeVal(bbox.max.x - bbox.min.x, 0),
      y: safeVal(bbox.max.y - bbox.min.y, 0),
      z: safeVal(bbox.max.z - bbox.min.z, 0)
    },
    safeZ: rapidZCounts.size > 0
      ? [...rapidZCounts.entries()].reduce((a, b) => (b[1] > a[1] ? b : a))[0]
      : null
  }
}
