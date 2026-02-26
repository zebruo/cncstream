import type { ConnectionConfig, SerialPortInfo } from './connection'
import type { MachineStatus, AlarmInfo } from './machine'
import type { JobProgress, JobOptions } from './job'

// Invoke channels (renderer -> main, request/response)
export const IpcChannels = {
  CONNECTION_LIST_PORTS: 'connection:list-ports',
  CONNECTION_CONNECT: 'connection:connect',
  CONNECTION_DISCONNECT: 'connection:disconnect',

  COMMAND_SEND: 'command:send',
  COMMAND_JOG: 'command:jog',
  COMMAND_JOG_CANCEL: 'command:jog-cancel',
  COMMAND_HOME: 'command:home',
  COMMAND_UNLOCK: 'command:unlock',
  COMMAND_RESET: 'command:reset',
  COMMAND_FEED_HOLD: 'command:feed-hold',
  COMMAND_CYCLE_START: 'command:cycle-start',

  OVERRIDE_FEED: 'override:feed',
  OVERRIDE_RAPID: 'override:rapid',
  OVERRIDE_SPINDLE: 'override:spindle',

  SPINDLE_SET: 'spindle:set',
  COOLANT_SET: 'coolant:set',

  FILE_OPEN_DIALOG: 'file:open-dialog',
  FILE_READ: 'file:read',

  JOB_START: 'job:start',
  JOB_PAUSE: 'job:pause',
  JOB_RESUME: 'job:resume',
  JOB_STOP: 'job:stop',

  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  SETTINGS_GET_GRBL: 'settings:get-grbl',
  SETTINGS_SET_GRBL: 'settings:set-grbl',

  COMMAND_PROBE_Z: 'command:probe-z'
} as const

// Event channels (main -> renderer, push)
export const IpcEvents = {
  MACHINE_STATUS_UPDATE: 'machine:status-update',
  MACHINE_RESPONSE: 'machine:response',
  MACHINE_ALARM: 'machine:alarm',
  MACHINE_CONSOLE_OUTPUT: 'machine:console-output',
  CONNECTION_STATE_CHANGED: 'connection:state-changed',
  JOB_PROGRESS_UPDATE: 'job:progress-update',
  JOB_COMPLETED: 'job:completed',
  JOB_ERROR: 'job:error',
  PORTS_CHANGED: 'ports:changed',
  STARTUP_INFO: 'startup:info',
  SPINDLE_CONFIG: 'spindle:config',
  PROBE_RESULT: 'probe:result'
} as const

// Jog parameters
export interface JogParams {
  x?: number
  y?: number
  z?: number
  a?: number
  feedRate: number
  isMetric?: boolean
}

// Spindle parameters
export interface SpindleParams {
  enabled: boolean
  direction: 'cw' | 'ccw'
  rpm: number
}

// Coolant parameters
export interface CoolantParams {
  flood: boolean
  mist: boolean
}

// Probe Z parameters
export interface ProbeZParams {
  feedRate: number
  maxDistance: number
  retractDistance: number
}

// Probe result
export interface ProbeResult {
  position: { x: number; y: number; z: number }
  success: boolean
}

// Override direction
export type OverrideAction = 'reset' | 'increase-10' | 'decrease-10' | 'increase-1' | 'decrease-1'
export type RapidOverrideLevel = 100 | 50 | 25

// CNCStream API exposed to renderer via contextBridge
export interface CNCStreamAPI {
  // Connection
  listPorts: () => Promise<SerialPortInfo[]>
  connect: (config: ConnectionConfig) => Promise<void>
  disconnect: () => Promise<void>

  // Commands
  sendCommand: (cmd: string) => Promise<void>
  jog: (params: JogParams) => Promise<void>
  jogCancel: () => Promise<void>
  home: () => Promise<void>
  unlock: () => Promise<void>
  reset: () => void
  feedHold: () => void
  cycleStart: () => void

  // Overrides
  setFeedOverride: (action: OverrideAction) => void
  setRapidOverride: (level: RapidOverrideLevel) => void
  setSpindleOverride: (action: OverrideAction) => void

  // Spindle / Coolant
  setSpindle: (params: SpindleParams) => Promise<void>
  setCoolant: (params: CoolantParams) => Promise<void>

  // File
  openFileDialog: () => Promise<{ path: string; content: string } | null>
  readFile: (path: string) => Promise<string>

  // Job
  startJob: (lines: string[], options?: JobOptions) => Promise<void>
  pauseJob: () => void
  resumeJob: () => void
  stopJob: () => void

  // Settings
  getSettings: () => Promise<Record<string, unknown>>
  setSettings: (settings: Record<string, unknown>) => Promise<void>
  getGrblSettings: () => Promise<void>
  probeZ: (params: ProbeZParams) => Promise<void>

  // Event listeners (return unsubscribe function)
  onMachineStatus: (callback: (status: MachineStatus) => void) => () => void
  onMachineResponse: (callback: (response: { type: string; code?: number; message?: string }) => void) => () => void
  onMachineAlarm: (callback: (alarm: AlarmInfo) => void) => () => void
  onConsoleOutput: (callback: (line: string) => void) => () => void
  onConnectionStateChanged: (callback: (state: string) => void) => () => void
  onJobProgress: (callback: (progress: JobProgress) => void) => () => void
  onJobCompleted: (callback: () => void) => () => void
  onJobError: (callback: (error: string) => void) => () => void
  onPortsChanged: (callback: (ports: SerialPortInfo[]) => void) => () => void
  onStartupInfo: (callback: (info: { version: string; isGrblHAL: boolean }) => void) => () => void
  onSpindleConfig: (callback: (config: { maxRpm: number; minRpm: number }) => void) => () => void
  onProbeResult: (callback: (result: ProbeResult) => void) => () => void
}
