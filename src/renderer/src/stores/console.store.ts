import { create } from 'zustand'

export interface ConsoleLine {
  id: number
  type: 'sent' | 'ok' | 'error' | 'info' | 'alarm'
  text: string
  timestamp: number
}

interface ConsoleStore {
  lines: ConsoleLine[]
  commandHistory: string[]
  historyIndex: number

  addLine: (type: ConsoleLine['type'], text: string) => void
  addCommand: (cmd: string) => void
  setHistoryIndex: (index: number) => void
  clear: () => void
}

let lineId = 0

const MAX_LINES = 500

export const useConsoleStore = create<ConsoleStore>((set, get) => ({
  lines: [],
  commandHistory: [],
  historyIndex: -1,

  addLine: (type, text) =>
    set((state) => {
      const lines = [...state.lines, { id: ++lineId, type, text, timestamp: Date.now() }]
      if (lines.length > MAX_LINES) lines.splice(0, lines.length - MAX_LINES)
      return { lines }
    }),

  addCommand: (cmd) =>
    set((state) => {
      const history = [cmd, ...state.commandHistory.filter((c) => c !== cmd)].slice(0, 50)
      return { commandHistory: history, historyIndex: -1 }
    }),

  setHistoryIndex: (index) => set({ historyIndex: index }),

  clear: () => set({ lines: [], historyIndex: -1 })
}))
