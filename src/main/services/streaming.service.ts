import { EventEmitter } from 'events'
import { CommandQueueService, CommandPriority } from './command-queue.service'
import type { JobProgress, JobState } from '@shared/types/job'
import { stripGcodeComments } from '@shared/utils/gcode-comments'

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
    const isExecutable = (l: string) => l.length > 0 && !l.startsWith(';') && !l.startsWith('(')
    this.lines = gcodeLines.map((l) => l.trim()).filter(isExecutable)

    // startFromLine is a raw-file line index; convert to filtered-array index
    if (startFromLine > 0) {
      let idx = 0
      for (let i = 0; i < Math.min(startFromLine, gcodeLines.length); i++) {
        if (isExecutable(gcodeLines[i].trim())) idx++
      }
      this.currentLineIndex = idx
    } else {
      this.currentLineIndex = 0
    }
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
      const cleaned = stripGcodeComments(line)

      if (cleaned.length === 0) {
        this.currentLineIndex++
        continue
      }

      // Numéro figé ici : au moment de l'erreur, currentLineIndex est déjà à la fin du fichier
      const lineNumber = this.currentLineIndex
      this.commandQueue
        .enqueue(cleaned, CommandPriority.NORMAL, lineNumber)
        .catch((err) => {
          this.errorCount++
          const detail = { lineNumber, command: cleaned, error: err.message as string }
          this.emit('line-error', detail)
          this.pauseOnError(detail)
        })

      this.currentLineIndex++
    }
  }

  /**
   * Première erreur d'une ligne pendant un job en cours : le job se met en pause
   * au lieu d'envoyer les lignes suivantes à une machine qui n'a pas exécuté celle-ci.
   * Les erreurs suivantes (lignes déjà dans le tampon de GRBL) et celles d'un arrêt
   * (« Queue flushed », job déjà repassé à idle) ne déclenchent rien de plus.
   */
  private pauseOnError(detail: { lineNumber: number; command: string; error: string }): void {
    if (this.state !== 'running') return
    this.pause()
    this.emit('paused-on-error', detail)
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
