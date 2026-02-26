import { EventEmitter } from 'events'
import { CommandQueueService, CommandPriority } from './command-queue.service'
import type { JobProgress, JobState } from '@shared/types/job'

export class StreamingService extends EventEmitter {
  private state: JobState = 'idle'
  private lines: string[] = []
  private currentLineIndex = 0
  private acknowledgedCount = 0
  private startTime = 0
  private errorCount = 0

  constructor(private commandQueue: CommandQueueService) {
    super()
    this.commandQueue.on('acknowledged', this.onAcknowledged.bind(this))
  }

  async start(gcodeLines: string[], startFromLine = 0): Promise<void> {
    this.lines = gcodeLines
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith(';') && !l.startsWith('('))

    this.currentLineIndex = startFromLine
    this.acknowledgedCount = 0
    this.errorCount = 0
    this.startTime = Date.now()
    this.state = 'running'

    this.emit('state', this.state)
    this.feedQueue()
  }

  private feedQueue(): void {
    if (this.state !== 'running') return

    while (this.currentLineIndex < this.lines.length) {
      const line = this.lines[this.currentLineIndex]
      const cleaned = line
        .replace(/\s*;.*$/, '')
        .replace(/\s*\(.*?\)/g, '')
        .trim()

      if (cleaned.length === 0) {
        this.currentLineIndex++
        continue
      }

      this.commandQueue
        .enqueue(cleaned, CommandPriority.NORMAL, this.currentLineIndex)
        .catch((err) => {
          this.errorCount++
          this.emit('line-error', { lineNumber: this.currentLineIndex, error: err.message })
        })

      this.currentLineIndex++
    }
  }

  private onAcknowledged(): void {
    if (this.state !== 'running' && this.state !== 'paused') return

    this.acknowledgedCount++
    this.emitProgress()

    if (this.acknowledgedCount >= this.lines.length) {
      this.state = 'completed'
      this.emit('state', this.state)
      this.emit('completed')
    }
  }

  private emitProgress(): void {
    const elapsed = Date.now() - this.startTime
    const linesPerMs = this.acknowledgedCount / Math.max(elapsed, 1)
    const remaining = (this.lines.length - this.acknowledgedCount) / Math.max(linesPerMs, 0.001)

    const progress: JobProgress = {
      totalLines: this.lines.length,
      sentLines: this.currentLineIndex,
      acknowledgedLines: this.acknowledgedCount,
      percentComplete: (this.acknowledgedCount / Math.max(this.lines.length, 1)) * 100,
      elapsedMs: elapsed,
      estimatedRemainingMs: remaining
    }

    this.emit('progress', progress)
  }

  pause(): void {
    if (this.state === 'running') {
      this.state = 'paused'
      this.commandQueue.pause()
      this.emit('state', this.state)
    }
  }

  resume(): void {
    if (this.state === 'paused') {
      this.state = 'running'
      this.commandQueue.resume()
      this.emit('state', this.state)
    }
  }

  stop(): void {
    this.state = 'idle'
    this.commandQueue.flush()
    this.emit('state', this.state)
  }

  getState(): JobState {
    return this.state
  }

  getCurrentLine(): number {
    return this.acknowledgedCount
  }
}
