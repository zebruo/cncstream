import { create } from 'zustand'
import type { ToolpathSegment } from '@shared/types/gcode'

interface BoundingBox {
  min: [number, number, number]
  max: [number, number, number]
}

interface VisualizationStore {
  toolpathSegments: ToolpathSegment[]
  boundingBox: BoundingBox | null
  currentPosition: [number, number, number]
  executedLineIndex: number

  setToolpath: (segments: ToolpathSegment[], bbox: BoundingBox) => void
  setCurrentPosition: (pos: [number, number, number]) => void
  setExecutedLineIndex: (idx: number) => void
  clear: () => void
}

export const useVisualizationStore = create<VisualizationStore>((set) => ({
  toolpathSegments: [],
  boundingBox: null,
  currentPosition: [0, 0, 0],
  executedLineIndex: -1,

  setToolpath: (segments, bbox) => set({ toolpathSegments: segments, boundingBox: bbox }),
  setCurrentPosition: (pos) => set({ currentPosition: pos }),
  setExecutedLineIndex: (idx) => set({ executedLineIndex: idx }),
  clear: () => set({ toolpathSegments: [], boundingBox: null, executedLineIndex: -1 })
}))
