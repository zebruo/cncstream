import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannels, IpcEvents } from '@shared/types/ipc'
import type { CNCStreamAPI } from '@shared/types/ipc'

function createEventListener(channel: string) {
  return (callback: (...args: any[]) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, ...args: any[]) => callback(...args)
    ipcRenderer.on(channel, handler)
    return () => {
      ipcRenderer.removeListener(channel, handler)
    }
  }
}

const api: CNCStreamAPI = {
  // Connection
  listPorts: () => ipcRenderer.invoke(IpcChannels.CONNECTION_LIST_PORTS),
  connect: (config) => ipcRenderer.invoke(IpcChannels.CONNECTION_CONNECT, config),
  disconnect: () => ipcRenderer.invoke(IpcChannels.CONNECTION_DISCONNECT),

  // Commands
  sendCommand: (cmd) => ipcRenderer.invoke(IpcChannels.COMMAND_SEND, cmd),
  jog: (params) => ipcRenderer.invoke(IpcChannels.COMMAND_JOG, params),
  jogCancel: () => ipcRenderer.invoke(IpcChannels.COMMAND_JOG_CANCEL),
  home: () => ipcRenderer.invoke(IpcChannels.COMMAND_HOME),
  unlock: () => ipcRenderer.invoke(IpcChannels.COMMAND_UNLOCK),
  reset: () => ipcRenderer.invoke(IpcChannels.COMMAND_RESET),
  feedHold: () => ipcRenderer.invoke(IpcChannels.COMMAND_FEED_HOLD),
  cycleStart: () => ipcRenderer.invoke(IpcChannels.COMMAND_CYCLE_START),

  // Overrides
  setFeedOverride: (action) => ipcRenderer.invoke(IpcChannels.OVERRIDE_FEED, action),
  setRapidOverride: (level) => ipcRenderer.invoke(IpcChannels.OVERRIDE_RAPID, level),
  setSpindleOverride: (action) => ipcRenderer.invoke(IpcChannels.OVERRIDE_SPINDLE, action),

  // Spindle / Coolant
  setSpindle: (params) => ipcRenderer.invoke(IpcChannels.SPINDLE_SET, params),
  setCoolant: (params) => ipcRenderer.invoke(IpcChannels.COOLANT_SET, params),

  // File
  openFileDialog: () => ipcRenderer.invoke(IpcChannels.FILE_OPEN_DIALOG),
  readFile: (path) => ipcRenderer.invoke(IpcChannels.FILE_READ, path),

  // Job
  startJob: (lines, options) => ipcRenderer.invoke(IpcChannels.JOB_START, lines, options),
  pauseJob: () => ipcRenderer.invoke(IpcChannels.JOB_PAUSE),
  resumeJob: () => ipcRenderer.invoke(IpcChannels.JOB_RESUME),
  stopJob: () => ipcRenderer.invoke(IpcChannels.JOB_STOP),

  // Settings
  getSettings: () => ipcRenderer.invoke(IpcChannels.SETTINGS_GET),
  setSettings: (settings) => ipcRenderer.invoke(IpcChannels.SETTINGS_SET, settings),
  getGrblSettings: () => ipcRenderer.invoke(IpcChannels.SETTINGS_GET_GRBL),
  probeZ: (params) => ipcRenderer.invoke(IpcChannels.COMMAND_PROBE_Z, params),

  // Event listeners
  onMachineStatus: createEventListener(IpcEvents.MACHINE_STATUS_UPDATE),
  onMachineResponse: createEventListener(IpcEvents.MACHINE_RESPONSE),
  onMachineAlarm: createEventListener(IpcEvents.MACHINE_ALARM),
  onConsoleOutput: createEventListener(IpcEvents.MACHINE_CONSOLE_OUTPUT),
  onConnectionStateChanged: createEventListener(IpcEvents.CONNECTION_STATE_CHANGED),
  onJobProgress: createEventListener(IpcEvents.JOB_PROGRESS_UPDATE),
  onJobCompleted: createEventListener(IpcEvents.JOB_COMPLETED),
  onJobError: createEventListener(IpcEvents.JOB_ERROR),
  onPortsChanged: createEventListener(IpcEvents.PORTS_CHANGED),
  onStartupInfo: createEventListener(IpcEvents.STARTUP_INFO),
  onSpindleConfig: createEventListener(IpcEvents.SPINDLE_CONFIG),
  onProbeResult: createEventListener(IpcEvents.PROBE_RESULT)
}

contextBridge.exposeInMainWorld('cncstream', api)
