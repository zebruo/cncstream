import { create } from 'zustand'
import type { MachineState, Position, MachineStatus } from '@shared/types/machine'

interface MachineStore {
  machineState: MachineState
  mpos: Position
  wpos: Position
  wco: Position
  feedRate: number
  spindleSpeed: number
  overrides: { feed: number; rapid: number; spindle: number }
  accessories: { spindleCW: boolean; spindleCCW: boolean; flood: boolean; mist: boolean }
  buffer: { planner: number; rx: number }
  alarmCode: number | null
  alarmMessage: string | null
  pins: string
  lineNumber: number | null
  spindleMaxRpm: number
  spindleMinRpm: number

  updateFromStatus: (status: MachineStatus) => void
  setAlarm: (code: number, message: string) => void
  clearAlarm: () => void
  setSpindleConfig: (maxRpm: number, minRpm: number) => void
}

const defaultPos: Position = { x: 0, y: 0, z: 0, a: 0 }

export const useMachineStore = create<MachineStore>((set) => ({
  machineState: 'Idle',
  mpos: { ...defaultPos },
  wpos: { ...defaultPos },
  wco: { ...defaultPos },
  feedRate: 0,
  spindleSpeed: 0,
  overrides: { feed: 100, rapid: 100, spindle: 100 },
  accessories: { spindleCW: false, spindleCCW: false, flood: false, mist: false },
  buffer: { planner: 0, rx: 0 },
  alarmCode: null,
  alarmMessage: null,
  pins: '',
  lineNumber: null,

  updateFromStatus: (status) =>
    set({
      machineState: status.state,
      mpos: status.mpos,
      wpos: status.wpos,
      wco: status.wco,
      feedRate: status.feed.current,
      spindleSpeed: status.spindle.speed,
      overrides: status.overrides,
      accessories: status.accessories,
      buffer: status.buffer,
      pins: status.pins,
      lineNumber: status.lineNumber ?? null
    }),

  spindleMaxRpm: 0,
  spindleMinRpm: 0,

  setAlarm: (code, message) => set({ alarmCode: code, alarmMessage: message }),
  clearAlarm: () => set({ alarmCode: null, alarmMessage: null }),
  setSpindleConfig: (maxRpm, minRpm) => set({ spindleMaxRpm: maxRpm, spindleMinRpm: minRpm })
}))
