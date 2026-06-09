import type { GCodeToken, ParsedGCodeLine, GCodeMovement, ParsedGCodeFile } from '@shared/types/gcode'

function tokenize(line: string): GCodeToken[] {
  const tokens: GCodeToken[] = []
  const regex = /([A-Z])(-?\d+\.?\d*)/gi
  let match
  while ((match = regex.exec(line)) !== null) {
    tokens.push({ letter: match[1].toUpperCase(), value: parseFloat(match[2]) })
  }
  return tokens
}

export function parseGCode(raw: string): ParsedGCodeFile {
  const rawLines = raw.split('\n')
  const lines: ParsedGCodeLine[] = []
  const movements: GCodeMovement[] = []

  let currentMotion = 'G0'
  let currentPosition = { x: 0, y: 0, z: 0 }
  let currentFeedRate = 0
  let currentSpindleSpeed = 0
  let isAbsolute = true

  for (let i = 0; i < rawLines.length; i++) {
    const raw = rawLines[i].trim()
    const isComment = raw.startsWith(';') || raw.startsWith('(') || raw.length === 0

    const cleaned = raw
      .replace(/\s*;.*$/, '')
      .replace(/\(.*?\)/g, '')
      .trim()

    const tokens = tokenize(cleaned)
    const params: Record<string, number> = {}
    let command: string | undefined

    for (const token of tokens) {
      const cmd = `${token.letter}${token.value}`
      if (token.letter === 'G' || token.letter === 'M') {
        // First G/M sets command; motion commands (G0-G3) always take priority
        if (command === undefined || ['G0', 'G1', 'G2', 'G3'].includes(cmd)) {
          command = cmd
        }
      }
      params[token.letter] = token.value
    }

    lines.push({ lineNumber: i, raw, tokens, command, params, isComment })

    if (isComment || cleaned.length === 0) continue

    // Process ALL G/M words on the line so multi-command lines (e.g. G21 G91 G0 X10) work
    for (const token of tokens) {
      if (token.letter === 'G') {
        const cmd = `G${token.value}`
        if (cmd === 'G90') isAbsolute = true
        else if (cmd === 'G91') isAbsolute = false
        else if (['G0', 'G1', 'G2', 'G3'].includes(cmd)) currentMotion = cmd
      }
    }
    if (params.F !== undefined) currentFeedRate = params.F
    if (params.S !== undefined) currentSpindleSpeed = params.S

    if (params.X !== undefined || params.Y !== undefined || params.Z !== undefined) {
      const from = { ...currentPosition }
      const to = {
        x: params.X !== undefined ? (isAbsolute ? params.X : currentPosition.x + params.X) : currentPosition.x,
        y: params.Y !== undefined ? (isAbsolute ? params.Y : currentPosition.y + params.Y) : currentPosition.y,
        z: params.Z !== undefined ? (isAbsolute ? params.Z : currentPosition.z + params.Z) : currentPosition.z
      }

      const movement: GCodeMovement = {
        lineIndex: i,
        type: currentMotion as GCodeMovement['type'],
        from,
        to,
        feedRate: currentMotion === 'G0' ? 0 : currentFeedRate,
        spindleSpeed: currentSpindleSpeed
      }

      if (currentMotion === 'G2' || currentMotion === 'G3') {
        if (params.I !== undefined) movement.i = params.I
        if (params.J !== undefined) movement.j = params.J
        if (params.K !== undefined) movement.k = params.K
        if (params.R !== undefined) movement.r = params.R
      }

      movements.push(movement)
      currentPosition = { ...to }
    }
  }

  return { lines, movements }
}
