import { EventEmitter } from 'events'
import { GRBL_RX_BUFFER_SIZE } from '@shared/constants/defaults'

export enum CommandPriority {
  HIGH = 1,
  NORMAL = 2
}

interface QueuedCommand {
  line: string
  priority: CommandPriority
  lineNumber?: number
  resolve: () => void
  reject: (reason: Error) => void
}

export class CommandQueueService extends EventEmitter {
  private queue: QueuedCommand[] = []
  private sentBuffer: QueuedCommand[] = []
  private currentBufferUsage = 0
  private paused = false

  async enqueue(
    line: string,
    priority: CommandPriority = CommandPriority.NORMAL,
    lineNumber?: number
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const cmd: QueuedCommand = { line, priority, lineNumber, resolve, reject }

      if (priority === CommandPriority.HIGH) {
        const insertIdx = this.queue.findIndex((c) => c.priority > CommandPriority.HIGH)
        this.queue.splice(insertIdx === -1 ? 0 : insertIdx, 0, cmd)
      } else {
        this.queue.push(cmd)
      }

      this.drain()
    })
  }

  private drain(): void {
    while (this.queue.length > 0) {
      if (this.paused && this.queue[0].priority !== CommandPriority.HIGH) return
      const next = this.queue[0]
      const lineLength = next.line.length + 1 // +1 for \n

      if (this.currentBufferUsage + lineLength > GRBL_RX_BUFFER_SIZE) {
        break
      }

      this.queue.shift()
      this.sentBuffer.push(next)
      this.currentBufferUsage += lineLength

      this.emit('send', next.line + '\n')
    }
  }

  onResponse(response: { type: 'ok' } | { type: 'error'; code: number; message: string }): void {
    const cmd = this.sentBuffer.shift()
    if (!cmd) return

    this.currentBufferUsage -= cmd.line.length + 1

    if (response.type === 'ok') {
      cmd.resolve()
    } else {
      cmd.reject(new Error(`GRBL error ${response.code}: ${response.message}`))
    }

    this.emit('acknowledged', {
      command: cmd.line,
      response,
      lineNumber: cmd.lineNumber
    })

    this.drain()
  }

  pause(): void {
    this.paused = true
  }

  resume(): void {
    this.paused = false
    this.drain()
  }

  flush(): void {
    for (const cmd of [...this.queue, ...this.sentBuffer]) {
      cmd.reject(new Error('Queue flushed'))
    }
    this.queue = []
    this.sentBuffer = []
    this.currentBufferUsage = 0
  }

  get pendingCount(): number {
    return this.queue.length + this.sentBuffer.length
  }

  get bufferUsage(): number {
    return this.currentBufferUsage
  }

  get isEmpty(): boolean {
    return this.queue.length === 0 && this.sentBuffer.length === 0
  }
}
