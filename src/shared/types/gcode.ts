export interface GCodeToken {
  letter: string
  value: number
}

export interface ParsedGCodeLine {
  lineNumber: number
  raw: string
  tokens: GCodeToken[]
  command?: string
  params: Record<string, number>
  isComment: boolean
}

export interface GCodeMovement {
  lineIndex: number
  type: 'G0' | 'G1' | 'G2' | 'G3'
  from: { x: number; y: number; z: number }
  to: { x: number; y: number; z: number }
  feedRate: number
  spindleSpeed: number
  i?: number
  j?: number
  k?: number
  r?: number
}

export interface ParsedGCodeFile {
  lines: ParsedGCodeLine[]
  movements: GCodeMovement[]
}

export interface FileInsight {
  lineCount: number
  movementCount: number
  feedRange: { min: number; max: number }
  spindleRange: { min: number; max: number }
  toolsUsed: number[]
  toolInfo: { number: number; diameter?: number; name?: string }[]
  estimatedTimeSeconds: number
  boundingBox: {
    min: { x: number; y: number; z: number }
    max: { x: number; y: number; z: number }
  }
  dimensions: { x: number; y: number; z: number }
  safeZ: number | null
}

export interface ToolpathSegment {
  type: 'rapid' | 'feed'
  points: [number, number, number][]
  feedRate: number
  lineIndex: number
}
