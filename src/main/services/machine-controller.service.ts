import { EventEmitter } from 'events'
import { SerialPortService } from './serial-port.service'
import { GrblProtocolService } from './grbl-protocol.service'
import { CommandQueueService, CommandPriority } from './command-queue.service'
import { StreamingService } from './streaming.service'
import { GRBL_REALTIME_COMMANDS, STATUS_POLL_INTERVAL_MS, SPINDLE_STARTUP_DELAY_MS } from '@shared/constants/defaults'
import type { SerialPortInfo } from '@shared/types/connection'
import type { OverrideAction, RapidOverrideLevel } from '@shared/types/ipc'

export class MachineControllerService extends EventEmitter {
  private serial: SerialPortService
  private protocol: GrblProtocolService
  private commandQueue: CommandQueueService
  private streaming: StreamingService
  private statusPollTimer: ReturnType<typeof setInterval> | null = null
  private _isConnected = false
  private pendingSpindleStop = false
  private spindleStoppedByHold = false

  constructor() {
    super()
    this.serial = new SerialPortService()
    this.protocol = new GrblProtocolService()
    this.commandQueue = new CommandQueueService()
    this.streaming = new StreamingService(this.commandQueue)

    // Wire: serial -> protocol -> route
    this.serial.on('line', (line: string) => {
      const response = this.protocol.parseLine(line)
      // Don't flood the console with status reports (5Hz polling),
      // don't duplicate ok/error (already shown via onMachineResponse),
      // and don't duplicate startup (already shown via onStartupInfo)
      if (response.type !== 'status' && response.type !== 'ok' && response.type !== 'error' && response.type !== 'startup') {
        this.emit('console', line)
      }

      switch (response.type) {
        case 'ok':
        case 'error':
          this.commandQueue.onResponse(response)
          this.emit('response', response)
          break
        case 'status':
          this.emit('status', response.data)
          if (this.pendingSpindleStop && response.data.state === 'Hold') {
            this.pendingSpindleStop = false
            const spindleOn = response.data.accessories.spindleCW || response.data.accessories.spindleCCW
            if (spindleOn) {
              this.spindleStoppedByHold = true
            }
            this.serial.writeRealtime(GRBL_REALTIME_COMMANDS.SPINDLE_STOP)
          }
          break
        case 'probe':
          this.emit('probe', response)
          break
        case 'alarm':
          this.emit('alarm', response)
          break
        case 'startup':
          this.emit('startup', response)
          break
        case 'setting':
          this.emit('setting', response)
          // Emit spindle config only when $30 is received (after $31 is already parsed)
          if (response.key === '$30') {
            this.emit('spindle-config', {
              maxRpm: this.protocol.spindleMaxRpm,
              minRpm: this.protocol.spindleMinRpm
            })
          }
          break
        default:
          this.emit('message', response)
      }
    })

    this.serial.on('close', () => {
      this._isConnected = false
      this.stopPolling()
      this.emit('disconnected')
    })

    this.serial.on('error', (err: Error) => {
      this.emit('error', err)
    })

    // Wire: command queue -> serial
    this.commandQueue.on('send', (data: string) => {
      this.emit('console', `> ${data.trim()}`)
      this.serial.write(data)
    })

    // Re-read GRBL settings when a $xx=value command is acknowledged
    this.commandQueue.on('acknowledged', ({ command, response }: { command: string; response: { type: string } }) => {
      if (response.type === 'ok' && /^\$\d+=/.test(command)) {
        setTimeout(() => {
          if (this._isConnected) {
            this.commandQueue.enqueue('$$', CommandPriority.NORMAL).catch(() => {})
          }
        }, 100)
      }
    })

    // Forward streaming events
    this.streaming.on('progress', (p) => this.emit('job:progress', p))
    this.streaming.on('completed', () => this.emit('job:completed'))
    this.streaming.on('state', (s) => this.emit('job:state', s))
    this.streaming.on('line-error', (e) => this.emit('job:error', e))
  }

  // --- Connection ---
  async listPorts(): Promise<SerialPortInfo[]> {
    return this.serial.listPorts()
  }

  async connect(path: string, baudRate: number): Promise<void> {
    await this.serial.open({ path, baudRate })
    this._isConnected = true
    this.protocol.reset()
    this.startPolling()

    // Auto-read GRBL settings after connection (with short delay for startup message)
    setTimeout(() => {
      if (this._isConnected) {
        this.commandQueue.enqueue('$$', CommandPriority.NORMAL).catch(() => {})
      }
    }, 500)
  }

  async disconnect(): Promise<void> {
    this.stopPolling()
    this.streaming.stop()
    this.commandQueue.flush()
    await this.serial.close()
    this._isConnected = false
  }

  get isConnected(): boolean {
    return this._isConnected
  }

  // --- Status Polling ---
  private startPolling(): void {
    this.statusPollTimer = setInterval(() => {
      this.serial.writeRealtime(GRBL_REALTIME_COMMANDS.STATUS_QUERY)
    }, STATUS_POLL_INTERVAL_MS)
  }

  private stopPolling(): void {
    if (this.statusPollTimer) {
      clearInterval(this.statusPollTimer)
      this.statusPollTimer = null
    }
  }

  // --- Realtime Commands (bypass queue) ---
  feedHold(): void {
    this.serial.writeRealtime(GRBL_REALTIME_COMMANDS.FEED_HOLD)
  }

  cycleStart(): void {
    this.serial.writeRealtime(GRBL_REALTIME_COMMANDS.CYCLE_START)
  }

  softReset(): void {
    this.serial.writeRealtime(GRBL_REALTIME_COMMANDS.SOFT_RESET)
    this.commandQueue.flush()
    this.protocol.reset()
  }

  jogCancel(): void {
    this.serial.writeRealtime(GRBL_REALTIME_COMMANDS.JOG_CANCEL)
  }

  // --- Override Commands ---
  setFeedOverride(action: OverrideAction): void {
    const map: Record<OverrideAction, number> = {
      reset: GRBL_REALTIME_COMMANDS.FEED_OV_RESET,
      'increase-10': GRBL_REALTIME_COMMANDS.FEED_OV_PLUS_10,
      'decrease-10': GRBL_REALTIME_COMMANDS.FEED_OV_MINUS_10,
      'increase-1': GRBL_REALTIME_COMMANDS.FEED_OV_PLUS_1,
      'decrease-1': GRBL_REALTIME_COMMANDS.FEED_OV_MINUS_1
    }
    const byte = map[action]
    const sent = this.serial.writeRealtime(byte)
    this.emit('console', `[OV] Feed ${action} → 0x${byte.toString(16).toUpperCase()} (${sent ? 'sent' : 'FAILED'})`)
  }

  setRapidOverride(level: RapidOverrideLevel): void {
    const map: Record<RapidOverrideLevel, number> = {
      100: GRBL_REALTIME_COMMANDS.RAPID_OV_100,
      50: GRBL_REALTIME_COMMANDS.RAPID_OV_50,
      25: GRBL_REALTIME_COMMANDS.RAPID_OV_25
    }
    const byte = map[level]
    const sent = this.serial.writeRealtime(byte)
    this.emit('console', `[OV] Rapid ${level}% → 0x${byte.toString(16).toUpperCase()} (${sent ? 'sent' : 'FAILED'})`)
  }

  setSpindleOverride(action: OverrideAction): void {
    const map: Record<OverrideAction, number> = {
      reset: GRBL_REALTIME_COMMANDS.SPINDLE_OV_RESET,
      'increase-10': GRBL_REALTIME_COMMANDS.SPINDLE_OV_PLUS_10,
      'decrease-10': GRBL_REALTIME_COMMANDS.SPINDLE_OV_MINUS_10,
      'increase-1': GRBL_REALTIME_COMMANDS.SPINDLE_OV_PLUS_1,
      'decrease-1': GRBL_REALTIME_COMMANDS.SPINDLE_OV_MINUS_1
    }
    const byte = map[action]
    const sent = this.serial.writeRealtime(byte)
    this.emit('console', `[OV] Spindle ${action} → 0x${byte.toString(16).toUpperCase()} (${sent ? 'sent' : 'FAILED'})`)
  }

  toggleFloodCoolant(): void {
    this.serial.writeRealtime(GRBL_REALTIME_COMMANDS.COOLANT_FLOOD_TOGGLE)
  }

  toggleMistCoolant(): void {
    this.serial.writeRealtime(GRBL_REALTIME_COMMANDS.COOLANT_MIST_TOGGLE)
  }

  // --- Queued Commands ---
  async sendCommand(cmd: string): Promise<void> {
    return this.commandQueue.enqueue(cmd, CommandPriority.NORMAL)
  }

  async jog(axis: string, distance: number, feedRate: number, isMetric = true): Promise<void> {
    const unitCmd = isMetric ? 'G21' : 'G20'
    const cmd = `$J=G91 ${unitCmd} ${axis}${distance.toFixed(4)} F${feedRate}`
    return this.commandQueue.enqueue(cmd, CommandPriority.HIGH)
  }

  async jogMulti(axes: Record<string, number>, feedRate: number, isMetric = true): Promise<void> {
    const unitCmd = isMetric ? 'G21' : 'G20'
    const axisStr = Object.entries(axes)
      .filter(([, v]) => v !== 0)
      .map(([k, v]) => `${k}${v.toFixed(4)}`)
      .join(' ')
    if (!axisStr) return
    const cmd = `$J=G91 ${unitCmd} ${axisStr} F${feedRate}`
    return this.commandQueue.enqueue(cmd, CommandPriority.HIGH)
  }

  async home(): Promise<void> {
    return this.commandQueue.enqueue('$H', CommandPriority.HIGH)
  }

  async unlock(): Promise<void> {
    return this.commandQueue.enqueue('$X', CommandPriority.HIGH)
  }

  async probeZ(feedRate: number, maxDistance: number, retractDistance: number): Promise<void> {
    await this.commandQueue.enqueue(`G38.2 Z-${maxDistance} F${feedRate}`, CommandPriority.HIGH)
    await this.commandQueue.enqueue(`G21 G91 G0 Z${retractDistance}`, CommandPriority.HIGH)
  }

  async getGrblSettings(): Promise<void> {
    return this.commandQueue.enqueue('$$', CommandPriority.NORMAL)
  }

  // --- Spindle ---
  async setSpindle(enabled: boolean, direction: 'cw' | 'ccw', rpm: number): Promise<void> {
    if (!enabled) {
      this.emit('console', `[CMD] Spindle OFF → M5`)
      return this.commandQueue.enqueue('M5', CommandPriority.HIGH)
    }
    const cmd = direction === 'cw' ? 'M3' : 'M4'
    this.emit('console', `[CMD] Spindle ON → ${cmd} S${rpm}`)
    return this.commandQueue.enqueue(`${cmd} S${rpm}`, CommandPriority.HIGH)
  }

  // --- Coolant ---
  async setCoolant(flood: boolean, mist: boolean): Promise<void> {
    if (!flood && !mist) {
      return this.sendCommand('M9')
    }
    if (flood) await this.sendCommand('M8')
    if (mist) await this.sendCommand('M7')
  }

  // --- Job Management ---
  async startJob(lines: string[], startFromLine = 0): Promise<void> {
    return this.streaming.start(lines, startFromLine)
  }

  pauseJob(): void {
    this.feedHold()
    this.streaming.pause()
    this.pendingSpindleStop = true
  }

  resumeJob(): void {
    this.pendingSpindleStop = false
    if (this.spindleStoppedByHold) {
      this.spindleStoppedByHold = false
      // Second 0x9e: cancels spindle stop override → spindle restarts while still in hold
      this.serial.writeRealtime(GRBL_REALTIME_COMMANDS.SPINDLE_STOP)
      // Wait for spindle to reach speed, then resume axes
      setTimeout(() => {
        this.cycleStart()
        this.streaming.resume()
      }, SPINDLE_STARTUP_DELAY_MS)
    } else {
      this.cycleStart()
      this.streaming.resume()
    }
  }

  stopJob(): void {
    this.pendingSpindleStop = false
    this.spindleStoppedByHold = false
    this.streaming.stop()
    this.softReset()
  }

  getJobState() {
    return this.streaming.getState()
  }
}
