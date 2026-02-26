export type MachineState =
  | 'Idle'
  | 'Run'
  | 'Hold'
  | 'Jog'
  | 'Alarm'
  | 'Door'
  | 'Check'
  | 'Home'
  | 'Sleep'
  | 'Tool'

export interface Position {
  x: number
  y: number
  z: number
  a: number
}

export interface MachineStatus {
  state: MachineState
  subState?: number
  mpos: Position
  wpos: Position
  wco: Position
  feed: { current: number; programmed: number }
  spindle: { speed: number; programmed: number; state: 'off' | 'cw' | 'ccw' }
  buffer: { planner: number; rx: number }
  pins: string
  overrides: { feed: number; rapid: number; spindle: number }
  accessories: {
    spindleCW: boolean
    spindleCCW: boolean
    flood: boolean
    mist: boolean
  }
  lineNumber?: number
}

export interface AlarmInfo {
  code: number
  message: string
  description: string
}

export interface ErrorInfo {
  code: number
  message: string
}

export interface GrblSetting {
  key: string
  value: string
  description: string
  units: string
}
