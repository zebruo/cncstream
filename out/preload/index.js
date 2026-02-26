"use strict";
const electron = require("electron");
const IpcChannels = {
  CONNECTION_LIST_PORTS: "connection:list-ports",
  CONNECTION_CONNECT: "connection:connect",
  CONNECTION_DISCONNECT: "connection:disconnect",
  COMMAND_SEND: "command:send",
  COMMAND_JOG: "command:jog",
  COMMAND_JOG_CANCEL: "command:jog-cancel",
  COMMAND_HOME: "command:home",
  COMMAND_UNLOCK: "command:unlock",
  COMMAND_RESET: "command:reset",
  COMMAND_FEED_HOLD: "command:feed-hold",
  COMMAND_CYCLE_START: "command:cycle-start",
  OVERRIDE_FEED: "override:feed",
  OVERRIDE_RAPID: "override:rapid",
  OVERRIDE_SPINDLE: "override:spindle",
  SPINDLE_SET: "spindle:set",
  COOLANT_SET: "coolant:set",
  FILE_OPEN_DIALOG: "file:open-dialog",
  FILE_READ: "file:read",
  JOB_START: "job:start",
  JOB_PAUSE: "job:pause",
  JOB_RESUME: "job:resume",
  JOB_STOP: "job:stop",
  SETTINGS_GET: "settings:get",
  SETTINGS_SET: "settings:set",
  SETTINGS_GET_GRBL: "settings:get-grbl",
  COMMAND_PROBE_Z: "command:probe-z"
};
const IpcEvents = {
  MACHINE_STATUS_UPDATE: "machine:status-update",
  MACHINE_RESPONSE: "machine:response",
  MACHINE_ALARM: "machine:alarm",
  MACHINE_CONSOLE_OUTPUT: "machine:console-output",
  CONNECTION_STATE_CHANGED: "connection:state-changed",
  JOB_PROGRESS_UPDATE: "job:progress-update",
  JOB_COMPLETED: "job:completed",
  JOB_ERROR: "job:error",
  PORTS_CHANGED: "ports:changed",
  STARTUP_INFO: "startup:info",
  SPINDLE_CONFIG: "spindle:config",
  PROBE_RESULT: "probe:result"
};
function createEventListener(channel) {
  return (callback) => {
    const handler = (_event, ...args) => callback(...args);
    electron.ipcRenderer.on(channel, handler);
    return () => {
      electron.ipcRenderer.removeListener(channel, handler);
    };
  };
}
const api = {
  // Connection
  listPorts: () => electron.ipcRenderer.invoke(IpcChannels.CONNECTION_LIST_PORTS),
  connect: (config) => electron.ipcRenderer.invoke(IpcChannels.CONNECTION_CONNECT, config),
  disconnect: () => electron.ipcRenderer.invoke(IpcChannels.CONNECTION_DISCONNECT),
  // Commands
  sendCommand: (cmd) => electron.ipcRenderer.invoke(IpcChannels.COMMAND_SEND, cmd),
  jog: (params) => electron.ipcRenderer.invoke(IpcChannels.COMMAND_JOG, params),
  jogCancel: () => electron.ipcRenderer.invoke(IpcChannels.COMMAND_JOG_CANCEL),
  home: () => electron.ipcRenderer.invoke(IpcChannels.COMMAND_HOME),
  unlock: () => electron.ipcRenderer.invoke(IpcChannels.COMMAND_UNLOCK),
  reset: () => electron.ipcRenderer.invoke(IpcChannels.COMMAND_RESET),
  feedHold: () => electron.ipcRenderer.invoke(IpcChannels.COMMAND_FEED_HOLD),
  cycleStart: () => electron.ipcRenderer.invoke(IpcChannels.COMMAND_CYCLE_START),
  // Overrides
  setFeedOverride: (action) => electron.ipcRenderer.invoke(IpcChannels.OVERRIDE_FEED, action),
  setRapidOverride: (level) => electron.ipcRenderer.invoke(IpcChannels.OVERRIDE_RAPID, level),
  setSpindleOverride: (action) => electron.ipcRenderer.invoke(IpcChannels.OVERRIDE_SPINDLE, action),
  // Spindle / Coolant
  setSpindle: (params) => electron.ipcRenderer.invoke(IpcChannels.SPINDLE_SET, params),
  setCoolant: (params) => electron.ipcRenderer.invoke(IpcChannels.COOLANT_SET, params),
  // File
  openFileDialog: () => electron.ipcRenderer.invoke(IpcChannels.FILE_OPEN_DIALOG),
  readFile: (path) => electron.ipcRenderer.invoke(IpcChannels.FILE_READ, path),
  // Job
  startJob: (lines, options) => electron.ipcRenderer.invoke(IpcChannels.JOB_START, lines, options),
  pauseJob: () => electron.ipcRenderer.invoke(IpcChannels.JOB_PAUSE),
  resumeJob: () => electron.ipcRenderer.invoke(IpcChannels.JOB_RESUME),
  stopJob: () => electron.ipcRenderer.invoke(IpcChannels.JOB_STOP),
  // Settings
  getSettings: () => electron.ipcRenderer.invoke(IpcChannels.SETTINGS_GET),
  setSettings: (settings) => electron.ipcRenderer.invoke(IpcChannels.SETTINGS_SET, settings),
  getGrblSettings: () => electron.ipcRenderer.invoke(IpcChannels.SETTINGS_GET_GRBL),
  probeZ: (params) => electron.ipcRenderer.invoke(IpcChannels.COMMAND_PROBE_Z, params),
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
};
electron.contextBridge.exposeInMainWorld("cncstream", api);
