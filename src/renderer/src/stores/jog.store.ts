import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { JogParams } from '@shared/types/ipc'
import { catchCommandError } from '../lib/command-errors'

type JogMode = 'incremental' | 'continuous'

interface JogStore {
  mode: JogMode
  stepSize: number
  feedRate: number
  continuousRate: number

  setMode: (mode: JogMode) => void
  setStepSize: (size: number) => void
  setFeedRate: (rate: number) => void
  setContinuousRate: (rate: number) => void

  jogXY: (dx: number, dy: number) => void
  jogZ: (dz: number) => void
  jogA: (da: number) => void
  cancelJog: () => void
}

export const useJogStore = create<JogStore>()(
  persist(
    (set, get) => ({
      mode: 'incremental',
      stepSize: 1,
      feedRate: 1000,
      continuousRate: 50,

      setMode: (mode) => set({ mode }),
      setStepSize: (size) => set({ stepSize: size }),
      setFeedRate: (rate) => set({ feedRate: rate }),
      setContinuousRate: (rate) => set({ continuousRate: rate }),

      jogXY: (dx, dy) => {
        const { stepSize, feedRate, mode, continuousRate } = get()
        if (mode === 'incremental') {
          const params: JogParams = { feedRate }
          if (dx !== 0) params.x = dx * stepSize
          if (dy !== 0) params.y = dy * stepSize
          catchCommandError(window.cncstream.jog(params))
        } else {
          const params: JogParams = { feedRate: feedRate * (continuousRate / 100) }
          if (dx !== 0) params.x = dx * 1000
          if (dy !== 0) params.y = dy * 1000
          catchCommandError(window.cncstream.jog(params))
        }
      },

      jogZ: (dz) => {
        const { stepSize, feedRate, mode, continuousRate } = get()
        const distance = mode === 'incremental' ? dz * stepSize : dz * 1000
        catchCommandError(window.cncstream.jog({ z: distance, feedRate: mode === 'incremental' ? feedRate : feedRate * (continuousRate / 100) }))
      },

      jogA: (da) => {
        const { stepSize, feedRate } = get()
        catchCommandError(window.cncstream.jog({ a: da * stepSize, feedRate }))
      },

      cancelJog: () => {
        catchCommandError(window.cncstream.jogCancel())
      }
    }),
    { name: 'cncstream-jog' }
  )
)
