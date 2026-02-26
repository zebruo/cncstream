export type JobState = 'idle' | 'running' | 'paused' | 'stopping' | 'completed' | 'error'

export interface JobProgress {
  totalLines: number
  sentLines: number
  acknowledgedLines: number
  percentComplete: number
  elapsedMs: number
  estimatedRemainingMs: number
}

export interface JobOptions {
  startFromLine?: number
}
