import { EventEmitter } from 'events'
import type { MachineStatus, MachineState, Position } from '@shared/types/machine'
import { GRBL_ERRORS } from '@shared/constants/grbl-errors'
import { GRBL_ALARMS } from '@shared/constants/grbl-alarms'

export type GrblResponse =
  | { type: 'ok' }
  | { type: 'error'; code: number; message: string }
  | { type: 'alarm'; code: number; message: string; description: string }
  | { type: 'status'; data: MachineStatus }
  | { type: 'feedback'; message: string }
  | { type: 'setting'; key: string; value: string }
  | { type: 'startup'; version: string; isGrblHAL: boolean }
  | { type: 'probe'; position: { x: number; y: number; z: number }; success: boolean }

export class GrblProtocolService extends EventEmitter {
  private lastWco: Position = { x: 0, y: 0, z: 0, a: 0 }
  private lastOverrides = { feed: 100, rapid: 100, spindle: 100 }
  private lastAccessories = { spindleCW: false, spindleCCW: false, flood: false, mist: false }
  private lastFeed = { current: 0, programmed: 0 }
  private lastSpindle = { speed: 0, programmed: 0, state: 'off' as 'off' | 'cw' | 'ccw' }
  private _isGrblHAL = false
  private _grblSettings: Record<string, string> = {}

  get isGrblHAL(): boolean {
    return this._isGrblHAL
  }

  get grblSettings(): Record<string, string> {
    return this._grblSettings
  }

  get spindleMaxRpm(): number {
    return parseInt(this._grblSettings['$30'] ?? '1000', 10) || 1000
  }

  get spindleMinRpm(): number {
    return parseInt(this._grblSettings['$31'] ?? '0', 10) || 0
  }

  parseLine(line: string): GrblResponse {
    const trimmed = line.trim()

    if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
      return this.parseStatusReport(trimmed)
    }

    if (trimmed === 'ok') {
      return { type: 'ok' }
    }

    if (trimmed.startsWith('error:')) {
      const code = parseInt(trimmed.split(':')[1], 10)
      return { type: 'error', code, message: GRBL_ERRORS[code] ?? `Unknown error ${code}` }
    }

    if (trimmed.startsWith('ALARM:')) {
      const code = parseInt(trimmed.split(':')[1], 10)
      const alarm = GRBL_ALARMS[code]
      return {
        type: 'alarm',
        code,
        message: alarm?.name ?? `Unknown alarm ${code}`,
        description: alarm?.description ?? ''
      }
    }

    if (trimmed.startsWith('[PRB:')) {
      const inner = trimmed.slice(5, -1) // 'x,y,z:success'
      const colonIdx = inner.lastIndexOf(':')
      const coords = inner.substring(0, colonIdx).split(',').map(Number)
      const success = inner.substring(colonIdx + 1) === '1'
      return { type: 'probe', position: { x: coords[0], y: coords[1], z: coords[2] }, success }
    }

    if (trimmed.startsWith('[MSG:')) {
      return { type: 'feedback', message: trimmed.slice(5, -1) }
    }

    if (trimmed.startsWith('[GC:') || trimmed.startsWith('[HLP:') || trimmed.startsWith('[VER:') || trimmed.startsWith('[OPT:')) {
      return { type: 'feedback', message: trimmed.slice(1, -1) }
    }

    if (trimmed.startsWith('$') && trimmed.includes('=')) {
      const eqIdx = trimmed.indexOf('=')
      const key = trimmed.substring(0, eqIdx)
      const value = trimmed.substring(eqIdx + 1)
      this._grblSettings[key] = value
      return { type: 'setting', key, value }
    }

    if (trimmed.startsWith('Grbl') || trimmed.startsWith('grblHAL')) {
      this._isGrblHAL = trimmed.startsWith('grblHAL')
      const version = trimmed.split('[')[0].trim()
      return { type: 'startup', version, isGrblHAL: this._isGrblHAL }
    }

    return { type: 'feedback', message: trimmed }
  }

  private parseStatusReport(raw: string): GrblResponse {
    const inner = raw.slice(1, -1)
    const sections = inner.split('|')
    const stateStr = sections[0]
    const colonIdx = stateStr.indexOf(':')
    const state = (colonIdx >= 0 ? stateStr.substring(0, colonIdx) : stateStr) as MachineState
    const subState = colonIdx >= 0 ? parseInt(stateStr.substring(colonIdx + 1), 10) : undefined

    const status: MachineStatus = {
      state,
      subState,
      mpos: { x: 0, y: 0, z: 0, a: 0 },
      wpos: { x: 0, y: 0, z: 0, a: 0 },
      wco: { ...this.lastWco },
      feed: { ...this.lastFeed },
      spindle: { ...this.lastSpindle },
      buffer: { planner: 0, rx: 0 },
      pins: '',
      overrides: { ...this.lastOverrides },
      accessories: { ...this.lastAccessories }
    }

    let hasMPos = false
    let hasWPos = false
    let hasOverrides = false
    let hasAccessories = false

    for (let i = 1; i < sections.length; i++) {
      const sec = sections[i]
      const cIdx = sec.indexOf(':')
      if (cIdx < 0) continue
      const key = sec.substring(0, cIdx)
      const value = sec.substring(cIdx + 1)

      switch (key) {
        case 'MPos': {
          const coords = value.split(',').map(Number)
          status.mpos = { x: coords[0], y: coords[1], z: coords[2], a: coords[3] ?? 0 }
          hasMPos = true
          break
        }
        case 'WPos': {
          const coords = value.split(',').map(Number)
          status.wpos = { x: coords[0], y: coords[1], z: coords[2], a: coords[3] ?? 0 }
          hasWPos = true
          break
        }
        case 'WCO': {
          const coords = value.split(',').map(Number)
          this.lastWco = { x: coords[0], y: coords[1], z: coords[2], a: coords[3] ?? 0 }
          status.wco = { ...this.lastWco }
          break
        }
        case 'Bf': {
          const [planner, rx] = value.split(',').map(Number)
          status.buffer = { planner, rx }
          break
        }
        case 'FS': {
          const [feed, spindle] = value.split(',').map(Number)
          status.feed = { current: feed, programmed: feed }
          status.spindle = { ...status.spindle, speed: spindle, programmed: spindle }
          this.lastFeed = { ...status.feed }
          this.lastSpindle = { ...status.spindle }
          break
        }
        case 'F': {
          const feed = Number(value)
          status.feed = { current: feed, programmed: feed }
          this.lastFeed = { ...status.feed }
          break
        }
        case 'Ov': {
          const [feedOv, rapidOv, spindleOv] = value.split(',').map(Number)
          status.overrides = { feed: feedOv, rapid: rapidOv, spindle: spindleOv }
          this.lastOverrides = { ...status.overrides }
          hasOverrides = true
          break
        }
        case 'Pn': {
          status.pins = value
          break
        }
        case 'A': {
          status.accessories = {
            spindleCW: value.includes('S'),
            spindleCCW: value.includes('C'),
            flood: value.includes('F'),
            mist: value.includes('M')
          }
          hasAccessories = true
          if (value.includes('S')) status.spindle.state = 'cw'
          else if (value.includes('C')) status.spindle.state = 'ccw'
          else status.spindle.state = 'off'
          this.lastSpindle = { ...status.spindle }
          break
        }
        case 'Ln': {
          status.lineNumber = parseInt(value, 10)
          break
        }
      }
    }

    // Calculate WPos from MPos or vice versa
    if (hasMPos && !hasWPos) {
      status.wpos = {
        x: status.mpos.x - this.lastWco.x,
        y: status.mpos.y - this.lastWco.y,
        z: status.mpos.z - this.lastWco.z,
        a: status.mpos.a - this.lastWco.a
      }
    } else if (hasWPos && !hasMPos) {
      status.mpos = {
        x: status.wpos.x + this.lastWco.x,
        y: status.wpos.y + this.lastWco.y,
        z: status.wpos.z + this.lastWco.z,
        a: status.wpos.a + this.lastWco.a
      }
    }

    // GRBL reports A: only alongside Ov:. If Ov: is present but A: is absent,
    // it means no accessories are active. If neither is present, keep last known state.
    if (hasOverrides && !hasAccessories) {
      status.accessories = { spindleCW: false, spindleCCW: false, flood: false, mist: false }
      status.spindle.state = 'off'
      this.lastSpindle = { ...status.spindle }
    }
    this.lastAccessories = { ...status.accessories }

    return { type: 'status', data: status }
  }

  reset(): void {
    this.lastWco = { x: 0, y: 0, z: 0, a: 0 }
    this.lastOverrides = { feed: 100, rapid: 100, spindle: 100 }
    this.lastAccessories = { spindleCW: false, spindleCCW: false, flood: false, mist: false }
    this.lastFeed = { current: 0, programmed: 0 }
    this.lastSpindle = { speed: 0, programmed: 0, state: 'off' }
  }
}
