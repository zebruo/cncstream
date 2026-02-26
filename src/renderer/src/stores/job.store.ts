import { create } from 'zustand'
import type { JobState, JobProgress } from '@shared/types/job'
import type { FileInsight } from '@shared/types/gcode'

interface JobStore {
  state: JobState
  filePath: string | null
  fileName: string | null
  fileContent: string | null
  fileInsight: FileInsight | null
  totalLines: number
  sentLines: number
  acknowledgedLines: number
  percentComplete: number
  elapsedMs: number
  estimatedRemainingMs: number
  error: string | null

  setFile: (path: string, name: string, content: string, insight: FileInsight) => void
  clearFile: () => void
  setJobState: (state: JobState) => void
  updateProgress: (progress: JobProgress) => void
  setError: (error: string) => void
  reset: () => void

  startJob: () => Promise<void>
  pauseJob: () => void
  resumeJob: () => void
  stopJob: () => void
  runMacro: (commands: string[]) => Promise<void>
}

export const useJobStore = create<JobStore>((set, get) => ({
  state: 'idle',
  filePath: null,
  fileName: null,
  fileContent: null,
  fileInsight: null,
  totalLines: 0,
  sentLines: 0,
  acknowledgedLines: 0,
  percentComplete: 0,
  elapsedMs: 0,
  estimatedRemainingMs: 0,
  error: null,

  setFile: (path, name, content, insight) =>
    set({
      filePath: path,
      fileName: name,
      fileContent: content,
      fileInsight: insight,
      state: 'idle',
      error: null
    }),

  clearFile: () =>
    set({
      filePath: null,
      fileName: null,
      fileContent: null,
      fileInsight: null,
      state: 'idle',
      totalLines: 0,
      sentLines: 0,
      acknowledgedLines: 0,
      percentComplete: 0,
      elapsedMs: 0,
      estimatedRemainingMs: 0,
      error: null
    }),

  setJobState: (state) => set({ state }),

  updateProgress: (progress) =>
    set({
      totalLines: progress.totalLines,
      sentLines: progress.sentLines,
      acknowledgedLines: progress.acknowledgedLines,
      percentComplete: progress.percentComplete,
      elapsedMs: progress.elapsedMs,
      estimatedRemainingMs: progress.estimatedRemainingMs
    }),

  setError: (error) => set({ error, state: 'error' }),

  reset: () =>
    set({
      state: 'idle',
      totalLines: 0,
      sentLines: 0,
      acknowledgedLines: 0,
      percentComplete: 0,
      elapsedMs: 0,
      estimatedRemainingMs: 0,
      error: null
    }),

  startJob: async () => {
    const { fileContent } = get()
    if (!fileContent) return
    const lines = fileContent.split('\n')
    set({ state: 'running', error: null })
    try {
      await window.cncstream.startJob(lines)
    } catch (e: any) {
      set({ state: 'error', error: e.message })
    }
  },

  pauseJob: () => {
    window.cncstream.pauseJob()
    set({ state: 'paused' })
  },

  resumeJob: () => {
    window.cncstream.resumeJob()
    set({ state: 'running' })
  },

  stopJob: () => {
    window.cncstream.stopJob()
    set({ state: 'idle' })
  },

  runMacro: async (commands: string[]) => {
    set({ state: 'running', error: null })
    try {
      await window.cncstream.startJob(commands)
    } catch (e: any) {
      set({ state: 'error', error: e.message })
    }
  }
}))
