"use strict";
const electron = require("electron");
const path = require("path");
const promises = require("fs/promises");
const events = require("events");
const serialport = require("serialport");
const parserReadline = require("@serialport/parser-readline");
const fs = require("fs");
function createMainWindow(settingsStore2) {
  const savedBounds = settingsStore2.get("windowBounds");
  electron.Menu.setApplicationMenu(null);
  const mainWindow2 = new electron.BrowserWindow({
    width: savedBounds?.width ?? 1400,
    height: savedBounds?.height ?? 900,
    x: savedBounds?.x,
    y: savedBounds?.y,
    minWidth: 1024,
    minHeight: 700,
    title: "CNCStream",
    backgroundColor: "#1a1b1e",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  const saveBounds = () => {
    const bounds = mainWindow2.getBounds();
    settingsStore2.set("windowBounds", bounds);
  };
  mainWindow2.on("resized", saveBounds);
  mainWindow2.on("moved", saveBounds);
  mainWindow2.webContents.setWindowOpenHandler(({ url }) => {
    electron.shell.openExternal(url);
    return { action: "deny" };
  });
  if (process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow2.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow2.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
  if (!electron.app.isPackaged) {
    mainWindow2.webContents.once("did-finish-load", () => {
      mainWindow2.webContents.openDevTools();
    });
  }
  return mainWindow2;
}
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
  STARTUP_INFO: "startup:info",
  SPINDLE_CONFIG: "spindle:config",
  PROBE_RESULT: "probe:result"
};
function registerConnectionHandlers(controller) {
  electron.ipcMain.handle(IpcChannels.CONNECTION_LIST_PORTS, async () => {
    return controller.listPorts();
  });
  electron.ipcMain.handle(IpcChannels.CONNECTION_CONNECT, async (_event, config) => {
    await controller.connect(config.path, config.baudRate);
  });
  electron.ipcMain.handle(IpcChannels.CONNECTION_DISCONNECT, async () => {
    await controller.disconnect();
  });
}
function registerCommandHandlers(controller) {
  electron.ipcMain.handle(IpcChannels.COMMAND_SEND, async (_event, cmd) => {
    await controller.sendCommand(cmd);
  });
  electron.ipcMain.handle(IpcChannels.COMMAND_JOG, async (_event, params) => {
    const axes = {};
    if (params.x !== void 0) axes["X"] = params.x;
    if (params.y !== void 0) axes["Y"] = params.y;
    if (params.z !== void 0) axes["Z"] = params.z;
    if (params.a !== void 0) axes["A"] = params.a;
    await controller.jogMulti(axes, params.feedRate, params.isMetric ?? true);
  });
  electron.ipcMain.handle(IpcChannels.COMMAND_JOG_CANCEL, async () => {
    controller.jogCancel();
  });
  electron.ipcMain.handle(IpcChannels.COMMAND_HOME, async () => {
    await controller.home();
  });
  electron.ipcMain.handle(IpcChannels.COMMAND_UNLOCK, async () => {
    await controller.unlock();
  });
  electron.ipcMain.handle(IpcChannels.COMMAND_RESET, async () => {
    controller.softReset();
  });
  electron.ipcMain.handle(IpcChannels.COMMAND_FEED_HOLD, async () => {
    controller.feedHold();
  });
  electron.ipcMain.handle(IpcChannels.COMMAND_CYCLE_START, async () => {
    controller.cycleStart();
  });
  electron.ipcMain.handle(IpcChannels.OVERRIDE_FEED, async (_event, action) => {
    controller.setFeedOverride(action);
  });
  electron.ipcMain.handle(IpcChannels.OVERRIDE_RAPID, async (_event, level) => {
    controller.setRapidOverride(level);
  });
  electron.ipcMain.handle(IpcChannels.OVERRIDE_SPINDLE, async (_event, action) => {
    controller.setSpindleOverride(action);
  });
  electron.ipcMain.handle(IpcChannels.SPINDLE_SET, async (_event, params) => {
    await controller.setSpindle(params.enabled, params.direction, params.rpm);
  });
  electron.ipcMain.handle(IpcChannels.COOLANT_SET, async (_event, params) => {
    await controller.setCoolant(params.flood, params.mist);
  });
  electron.ipcMain.handle(IpcChannels.SETTINGS_GET_GRBL, async () => {
    await controller.getGrblSettings();
  });
  electron.ipcMain.handle(IpcChannels.COMMAND_PROBE_Z, async (_event, params) => {
    await controller.probeZ(params.feedRate, params.maxDistance, params.retractDistance);
  });
}
function registerFileHandlers(mainWindow2) {
  electron.ipcMain.handle(IpcChannels.FILE_OPEN_DIALOG, async () => {
    const result = await electron.dialog.showOpenDialog(mainWindow2, {
      properties: ["openFile"],
      filters: [
        { name: "G-Code Files", extensions: ["gcode", "nc", "ngc", "tap", "cnc", "gc", "ncc"] },
        { name: "All Files", extensions: ["*"] }
      ]
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    const filePath = result.filePaths[0];
    const content = await promises.readFile(filePath, "utf-8");
    return { path: filePath, content };
  });
  electron.ipcMain.handle(IpcChannels.FILE_READ, async (_event, filePath) => {
    return promises.readFile(filePath, "utf-8");
  });
}
function registerSettingsHandlers(settingsStore2) {
  electron.ipcMain.handle(IpcChannels.SETTINGS_GET, async () => {
    return settingsStore2.getAll();
  });
  electron.ipcMain.handle(IpcChannels.SETTINGS_SET, async (_event, settings) => {
    settingsStore2.setMultiple(settings);
  });
}
function registerJobHandlers(controller) {
  electron.ipcMain.handle(IpcChannels.JOB_START, async (_event, lines, options) => {
    await controller.startJob(lines, options?.startFromLine ?? 0);
  });
  electron.ipcMain.handle(IpcChannels.JOB_PAUSE, async () => {
    controller.pauseJob();
  });
  electron.ipcMain.handle(IpcChannels.JOB_RESUME, async () => {
    controller.resumeJob();
  });
  electron.ipcMain.handle(IpcChannels.JOB_STOP, async () => {
    controller.stopJob();
  });
}
function registerAllIpcHandlers(mainWindow2, machineController2, settingsStore2) {
  registerConnectionHandlers(machineController2);
  registerCommandHandlers(machineController2);
  registerFileHandlers(mainWindow2);
  registerSettingsHandlers(settingsStore2);
  registerJobHandlers(machineController2);
}
class SerialPortService extends events.EventEmitter {
  port = null;
  parser = null;
  async listPorts() {
    const ports = await serialport.SerialPort.list();
    return ports.map((p) => ({
      path: p.path,
      manufacturer: p.manufacturer,
      serialNumber: p.serialNumber,
      pnpId: p.pnpId,
      friendlyName: p.friendlyName,
      vendorId: p.vendorId,
      productId: p.productId
    }));
  }
  async open(config) {
    if (this.port?.isOpen) {
      await this.close();
    }
    this.port = new serialport.SerialPort({
      path: config.path,
      baudRate: config.baudRate,
      autoOpen: false
    });
    this.parser = this.port.pipe(new parserReadline.ReadlineParser({ delimiter: "\r\n" }));
    this.parser.on("data", (line) => {
      this.emit("line", line);
    });
    this.port.on("close", () => this.emit("close"));
    this.port.on("error", (err) => this.emit("error", err));
    return new Promise((resolve, reject) => {
      this.port.open((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
  write(data) {
    if (!this.port?.isOpen) return false;
    this.port.write(data);
    return true;
  }
  writeRealtime(byte) {
    if (!this.port?.isOpen) return false;
    this.port.write(Buffer.from([byte]));
    this.port.drain(() => {
    });
    return true;
  }
  async close() {
    return new Promise((resolve) => {
      if (!this.port?.isOpen) {
        resolve();
        return;
      }
      this.port.close((err) => {
        this.port = null;
        this.parser = null;
        resolve();
      });
    });
  }
  get isOpen() {
    return this.port?.isOpen ?? false;
  }
}
const GRBL_ERRORS = {
  1: "G-code words consist of a letter and a value. Letter was not found.",
  2: "Numeric value format is not valid or missing an expected value.",
  3: "Grbl $ system command was not recognized or supported.",
  4: "Negative value received for an expected positive value.",
  5: "Homing cycle is not enabled via settings.",
  6: "Minimum step pulse time must be greater than 3usec.",
  7: "EEPROM read failed. Reset and restored to default values.",
  8: "Grbl $ command cannot be used unless Grbl is IDLE.",
  9: "G-code locked out during alarm or jog state.",
  10: "Soft limits cannot be enabled without homing also enabled.",
  11: "Max characters per line exceeded. Line was not processed and executed.",
  12: "Grbl $ setting value exceeds the maximum step rate supported.",
  13: "Safety door detected as opened and door state initiated.",
  14: "Build info or startup line exceeds EEPROM line length limit.",
  15: "Jog target exceeds machine travel. Command ignored.",
  16: "Jog command with no = or contains prohibited g-code.",
  17: "Laser mode requires PWM output.",
  20: "Unsupported or invalid g-code command found in block.",
  21: "More than one g-code command from same modal group found in block.",
  22: "Feed rate has not yet been set or is undefined.",
  23: "G-code command in block requires an integer value.",
  24: "Two G-code commands that both require the use of the XYZ axis words were detected.",
  25: "A G-code word was repeated in the block.",
  26: "A G-code command implicitly or explicitly requires XYZ axis words in the block, but none were found.",
  27: "N line number value is not within the valid range of 1 - 9,999,999.",
  28: "A G-code command was sent, but is missing some required P or L value words.",
  29: "Grbl supports six work coordinate systems G54-G59. G59.1, G59.2, and G59.3 are not supported.",
  30: "The G53 G-code command requires either a G0 seek or G1 feed motion mode to be active.",
  31: "There are unused axis words in the block and G80 motion mode cancel is active.",
  32: "A G2 or G3 arc was commanded but there are no XYZ axis words in the selected plane to trace the arc.",
  33: "The motion command has an invalid target. G2, G3, and G38.2 generates this error.",
  34: "A G2 or G3 arc, traced with the radius definition, had a mathematical error when computing the arc geometry.",
  35: "A G2 or G3 arc, traced with the offset definition, is missing the IJK offset word in the selected plane.",
  36: "There are unused, leftover G-code words that aren't used by any command in the block.",
  37: "The G43.1 dynamic tool length offset command cannot apply an offset to an axis other than its configured axis.",
  38: "Tool number greater than max supported value."
};
const GRBL_ALARMS = {
  1: {
    name: "Hard limit triggered",
    description: "Hard limit has been triggered. Machine position is likely lost due to sudden and immediate halt. Re-homing is highly recommended."
  },
  2: {
    name: "Soft limit alarm",
    description: "G-code motion target exceeds machine travel. Machine position safely retained. Alarm may be unlocked."
  },
  3: {
    name: "Reset while in motion",
    description: "Reset while in motion. Grbl cannot guarantee position. Lost steps are likely. Re-homing is highly recommended."
  },
  4: {
    name: "Probe fail",
    description: "Probe fail. The probe is not in the expected initial state before starting probe cycle, because G38.2 and G38.3 is not triggered and G38.4 and G38.5 is triggered."
  },
  5: {
    name: "Probe fail",
    description: "Probe fail. The probe did not contact the workpiece within the programmed travel for G38.2 and G38.4."
  },
  6: {
    name: "Homing fail",
    description: "Homing fail. Reset during active homing cycle."
  },
  7: {
    name: "Homing fail",
    description: "Homing fail. Safety door was opened during active homing cycle."
  },
  8: {
    name: "Homing fail",
    description: "Homing fail. Cycle failed to clear limit switch when pulling off. Try increasing pull-off setting or check wiring."
  },
  9: {
    name: "Homing fail",
    description: "Homing fail. Could not find limit switch within search distance. Defined as 1.5 * max_travel on search and 5 * pulloff on locate phases."
  },
  10: {
    name: "Homing fail",
    description: "Homing fail. On dual axis machines, could not find the second limit switch for self-squaring."
  }
};
class GrblProtocolService extends events.EventEmitter {
  lastWco = { x: 0, y: 0, z: 0, a: 0 };
  lastOverrides = { feed: 100, rapid: 100, spindle: 100 };
  lastAccessories = { spindleCW: false, spindleCCW: false, flood: false, mist: false };
  lastFeed = { current: 0, programmed: 0 };
  lastSpindle = { speed: 0, programmed: 0, state: "off" };
  _isGrblHAL = false;
  _grblSettings = {};
  get isGrblHAL() {
    return this._isGrblHAL;
  }
  get grblSettings() {
    return this._grblSettings;
  }
  get spindleMaxRpm() {
    return parseInt(this._grblSettings["$30"] ?? "1000", 10) || 1e3;
  }
  get spindleMinRpm() {
    return parseInt(this._grblSettings["$31"] ?? "0", 10) || 0;
  }
  parseLine(line) {
    const trimmed = line.trim();
    if (trimmed.startsWith("<") && trimmed.endsWith(">")) {
      return this.parseStatusReport(trimmed);
    }
    if (trimmed === "ok") {
      return { type: "ok" };
    }
    if (trimmed.startsWith("error:")) {
      const code = parseInt(trimmed.split(":")[1], 10);
      return { type: "error", code, message: GRBL_ERRORS[code] ?? `Unknown error ${code}` };
    }
    if (trimmed.startsWith("ALARM:")) {
      const code = parseInt(trimmed.split(":")[1], 10);
      const alarm = GRBL_ALARMS[code];
      return {
        type: "alarm",
        code,
        message: alarm?.name ?? `Unknown alarm ${code}`,
        description: alarm?.description ?? ""
      };
    }
    if (trimmed.startsWith("[PRB:")) {
      const inner = trimmed.slice(5, -1);
      const colonIdx = inner.lastIndexOf(":");
      const coords = inner.substring(0, colonIdx).split(",").map(Number);
      const success = inner.substring(colonIdx + 1) === "1";
      return { type: "probe", position: { x: coords[0], y: coords[1], z: coords[2] }, success };
    }
    if (trimmed.startsWith("[MSG:")) {
      return { type: "feedback", message: trimmed.slice(5, -1) };
    }
    if (trimmed.startsWith("[GC:") || trimmed.startsWith("[HLP:") || trimmed.startsWith("[VER:") || trimmed.startsWith("[OPT:")) {
      return { type: "feedback", message: trimmed.slice(1, -1) };
    }
    if (trimmed.startsWith("$") && trimmed.includes("=")) {
      const eqIdx = trimmed.indexOf("=");
      const key = trimmed.substring(0, eqIdx);
      const value = trimmed.substring(eqIdx + 1);
      this._grblSettings[key] = value;
      return { type: "setting", key, value };
    }
    if (trimmed.startsWith("Grbl") || trimmed.startsWith("grblHAL")) {
      this._isGrblHAL = trimmed.startsWith("grblHAL");
      const version = trimmed.split("[")[0].trim();
      return { type: "startup", version, isGrblHAL: this._isGrblHAL };
    }
    return { type: "feedback", message: trimmed };
  }
  parseStatusReport(raw) {
    const inner = raw.slice(1, -1);
    const sections = inner.split("|");
    const stateStr = sections[0];
    const colonIdx = stateStr.indexOf(":");
    const state = colonIdx >= 0 ? stateStr.substring(0, colonIdx) : stateStr;
    const subState = colonIdx >= 0 ? parseInt(stateStr.substring(colonIdx + 1), 10) : void 0;
    const status = {
      state,
      subState,
      mpos: { x: 0, y: 0, z: 0, a: 0 },
      wpos: { x: 0, y: 0, z: 0, a: 0 },
      wco: { ...this.lastWco },
      feed: { ...this.lastFeed },
      spindle: { ...this.lastSpindle },
      buffer: { planner: 0, rx: 0 },
      pins: "",
      overrides: { ...this.lastOverrides },
      accessories: { ...this.lastAccessories }
    };
    let hasMPos = false;
    let hasWPos = false;
    let hasOverrides = false;
    let hasAccessories = false;
    for (let i = 1; i < sections.length; i++) {
      const sec = sections[i];
      const cIdx = sec.indexOf(":");
      if (cIdx < 0) continue;
      const key = sec.substring(0, cIdx);
      const value = sec.substring(cIdx + 1);
      switch (key) {
        case "MPos": {
          const coords = value.split(",").map(Number);
          status.mpos = { x: coords[0], y: coords[1], z: coords[2], a: coords[3] ?? 0 };
          hasMPos = true;
          break;
        }
        case "WPos": {
          const coords = value.split(",").map(Number);
          status.wpos = { x: coords[0], y: coords[1], z: coords[2], a: coords[3] ?? 0 };
          hasWPos = true;
          break;
        }
        case "WCO": {
          const coords = value.split(",").map(Number);
          this.lastWco = { x: coords[0], y: coords[1], z: coords[2], a: coords[3] ?? 0 };
          status.wco = { ...this.lastWco };
          break;
        }
        case "Bf": {
          const [planner, rx] = value.split(",").map(Number);
          status.buffer = { planner, rx };
          break;
        }
        case "FS": {
          const [feed, spindle] = value.split(",").map(Number);
          status.feed = { current: feed, programmed: feed };
          status.spindle = { ...status.spindle, speed: spindle, programmed: spindle };
          this.lastFeed = { ...status.feed };
          this.lastSpindle = { ...status.spindle };
          break;
        }
        case "F": {
          const feed = Number(value);
          status.feed = { current: feed, programmed: feed };
          this.lastFeed = { ...status.feed };
          break;
        }
        case "Ov": {
          const [feedOv, rapidOv, spindleOv] = value.split(",").map(Number);
          status.overrides = { feed: feedOv, rapid: rapidOv, spindle: spindleOv };
          this.lastOverrides = { ...status.overrides };
          hasOverrides = true;
          break;
        }
        case "Pn": {
          status.pins = value;
          break;
        }
        case "A": {
          status.accessories = {
            spindleCW: value.includes("S"),
            spindleCCW: value.includes("C"),
            flood: value.includes("F"),
            mist: value.includes("M")
          };
          hasAccessories = true;
          if (value.includes("S")) status.spindle.state = "cw";
          else if (value.includes("C")) status.spindle.state = "ccw";
          else status.spindle.state = "off";
          this.lastSpindle = { ...status.spindle };
          break;
        }
        case "Ln": {
          status.lineNumber = parseInt(value, 10);
          break;
        }
      }
    }
    if (hasMPos && !hasWPos) {
      status.wpos = {
        x: status.mpos.x - this.lastWco.x,
        y: status.mpos.y - this.lastWco.y,
        z: status.mpos.z - this.lastWco.z,
        a: status.mpos.a - this.lastWco.a
      };
    } else if (hasWPos && !hasMPos) {
      status.mpos = {
        x: status.wpos.x + this.lastWco.x,
        y: status.wpos.y + this.lastWco.y,
        z: status.wpos.z + this.lastWco.z,
        a: status.wpos.a + this.lastWco.a
      };
    }
    if (hasOverrides && !hasAccessories) {
      status.accessories = { spindleCW: false, spindleCCW: false, flood: false, mist: false };
      status.spindle.state = "off";
      this.lastSpindle = { ...status.spindle };
    }
    this.lastAccessories = { ...status.accessories };
    return { type: "status", data: status };
  }
  reset() {
    this.lastWco = { x: 0, y: 0, z: 0, a: 0 };
    this.lastOverrides = { feed: 100, rapid: 100, spindle: 100 };
    this.lastAccessories = { spindleCW: false, spindleCCW: false, flood: false, mist: false };
    this.lastFeed = { current: 0, programmed: 0 };
    this.lastSpindle = { speed: 0, programmed: 0, state: "off" };
  }
}
const STATUS_POLL_INTERVAL_MS = 200;
const GRBL_RX_BUFFER_SIZE = 127;
const SPINDLE_STARTUP_DELAY_MS = 3e3;
const GRBL_REALTIME_COMMANDS = {
  STATUS_QUERY: 63,
  // ?
  FEED_HOLD: 33,
  // !
  CYCLE_START: 126,
  // ~
  SOFT_RESET: 24,
  // Ctrl-X
  JOG_CANCEL: 133,
  FEED_OV_RESET: 144,
  FEED_OV_PLUS_10: 145,
  FEED_OV_MINUS_10: 146,
  FEED_OV_PLUS_1: 147,
  FEED_OV_MINUS_1: 148,
  RAPID_OV_100: 149,
  RAPID_OV_50: 150,
  RAPID_OV_25: 151,
  SPINDLE_OV_RESET: 153,
  SPINDLE_OV_PLUS_10: 154,
  SPINDLE_OV_MINUS_10: 155,
  SPINDLE_OV_PLUS_1: 156,
  SPINDLE_OV_MINUS_1: 157,
  SPINDLE_STOP: 158,
  COOLANT_FLOOD_TOGGLE: 160,
  COOLANT_MIST_TOGGLE: 161
};
var CommandPriority = /* @__PURE__ */ ((CommandPriority2) => {
  CommandPriority2[CommandPriority2["HIGH"] = 1] = "HIGH";
  CommandPriority2[CommandPriority2["NORMAL"] = 2] = "NORMAL";
  return CommandPriority2;
})(CommandPriority || {});
class CommandQueueService extends events.EventEmitter {
  queue = [];
  sentBuffer = [];
  currentBufferUsage = 0;
  paused = false;
  async enqueue(line, priority = 2, lineNumber) {
    return new Promise((resolve, reject) => {
      const cmd = { line, priority, lineNumber, resolve, reject };
      if (priority === 1) {
        const insertIdx = this.queue.findIndex(
          (c) => c.priority > 1
          /* HIGH */
        );
        this.queue.splice(insertIdx === -1 ? 0 : insertIdx, 0, cmd);
      } else {
        this.queue.push(cmd);
      }
      this.drain();
    });
  }
  drain() {
    while (this.queue.length > 0) {
      if (this.paused && this.queue[0].priority !== 1) return;
      const next = this.queue[0];
      const lineLength = next.line.length + 1;
      if (this.currentBufferUsage + lineLength > GRBL_RX_BUFFER_SIZE) {
        break;
      }
      this.queue.shift();
      this.sentBuffer.push(next);
      this.currentBufferUsage += lineLength;
      this.emit("send", next.line + "\n");
    }
  }
  onResponse(response) {
    const cmd = this.sentBuffer.shift();
    if (!cmd) return;
    this.currentBufferUsage -= cmd.line.length + 1;
    if (response.type === "ok") {
      cmd.resolve();
    } else {
      cmd.reject(new Error(`GRBL error ${response.code}: ${response.message}`));
    }
    this.emit("acknowledged", {
      command: cmd.line,
      response,
      lineNumber: cmd.lineNumber
    });
    this.drain();
  }
  pause() {
    this.paused = true;
  }
  resume() {
    this.paused = false;
    this.drain();
  }
  flush() {
    for (const cmd of [...this.queue, ...this.sentBuffer]) {
      cmd.reject(new Error("Queue flushed"));
    }
    this.queue = [];
    this.sentBuffer = [];
    this.currentBufferUsage = 0;
  }
  get pendingCount() {
    return this.queue.length + this.sentBuffer.length;
  }
  get bufferUsage() {
    return this.currentBufferUsage;
  }
  get isEmpty() {
    return this.queue.length === 0 && this.sentBuffer.length === 0;
  }
}
class StreamingService extends events.EventEmitter {
  constructor(commandQueue) {
    super();
    this.commandQueue = commandQueue;
    this.commandQueue.on("acknowledged", this.onAcknowledged.bind(this));
  }
  state = "idle";
  lines = [];
  currentLineIndex = 0;
  acknowledgedCount = 0;
  startTime = 0;
  errorCount = 0;
  async start(gcodeLines, startFromLine = 0) {
    this.lines = gcodeLines.map((l) => l.trim()).filter((l) => l.length > 0 && !l.startsWith(";") && !l.startsWith("("));
    this.currentLineIndex = startFromLine;
    this.acknowledgedCount = 0;
    this.errorCount = 0;
    this.startTime = Date.now();
    this.state = "running";
    this.emit("state", this.state);
    this.feedQueue();
  }
  feedQueue() {
    if (this.state !== "running") return;
    while (this.currentLineIndex < this.lines.length) {
      const line = this.lines[this.currentLineIndex];
      const cleaned = line.replace(/\s*;.*$/, "").replace(/\s*\(.*?\)/g, "").trim();
      if (cleaned.length === 0) {
        this.currentLineIndex++;
        continue;
      }
      this.commandQueue.enqueue(cleaned, CommandPriority.NORMAL, this.currentLineIndex).catch((err) => {
        this.errorCount++;
        this.emit("line-error", { lineNumber: this.currentLineIndex, error: err.message });
      });
      this.currentLineIndex++;
    }
  }
  onAcknowledged() {
    if (this.state !== "running" && this.state !== "paused") return;
    this.acknowledgedCount++;
    this.emitProgress();
    if (this.acknowledgedCount >= this.lines.length) {
      this.state = "completed";
      this.emit("state", this.state);
      this.emit("completed");
    }
  }
  emitProgress() {
    const elapsed = Date.now() - this.startTime;
    const linesPerMs = this.acknowledgedCount / Math.max(elapsed, 1);
    const remaining = (this.lines.length - this.acknowledgedCount) / Math.max(linesPerMs, 1e-3);
    const progress = {
      totalLines: this.lines.length,
      sentLines: this.currentLineIndex,
      acknowledgedLines: this.acknowledgedCount,
      percentComplete: this.acknowledgedCount / Math.max(this.lines.length, 1) * 100,
      elapsedMs: elapsed,
      estimatedRemainingMs: remaining
    };
    this.emit("progress", progress);
  }
  pause() {
    if (this.state === "running") {
      this.state = "paused";
      this.commandQueue.pause();
      this.emit("state", this.state);
    }
  }
  resume() {
    if (this.state === "paused") {
      this.state = "running";
      this.commandQueue.resume();
      this.emit("state", this.state);
    }
  }
  stop() {
    this.state = "idle";
    this.commandQueue.flush();
    this.emit("state", this.state);
  }
  getState() {
    return this.state;
  }
  getCurrentLine() {
    return this.acknowledgedCount;
  }
}
class MachineControllerService extends events.EventEmitter {
  serial;
  protocol;
  commandQueue;
  streaming;
  statusPollTimer = null;
  _isConnected = false;
  pendingSpindleStop = false;
  spindleStoppedByHold = false;
  constructor() {
    super();
    this.serial = new SerialPortService();
    this.protocol = new GrblProtocolService();
    this.commandQueue = new CommandQueueService();
    this.streaming = new StreamingService(this.commandQueue);
    this.serial.on("line", (line) => {
      const response = this.protocol.parseLine(line);
      if (response.type !== "status" && response.type !== "ok" && response.type !== "error" && response.type !== "startup") {
        this.emit("console", line);
      }
      switch (response.type) {
        case "ok":
        case "error":
          this.commandQueue.onResponse(response);
          this.emit("response", response);
          break;
        case "status":
          this.emit("status", response.data);
          if (this.pendingSpindleStop && response.data.state === "Hold") {
            this.pendingSpindleStop = false;
            const spindleOn = response.data.accessories.spindleCW || response.data.accessories.spindleCCW;
            if (spindleOn) {
              this.spindleStoppedByHold = true;
            }
            this.serial.writeRealtime(GRBL_REALTIME_COMMANDS.SPINDLE_STOP);
          }
          break;
        case "probe":
          this.emit("probe", response);
          break;
        case "alarm":
          this.emit("alarm", response);
          break;
        case "startup":
          this.emit("startup", response);
          break;
        case "setting":
          this.emit("setting", response);
          if (response.key === "$30") {
            this.emit("spindle-config", {
              maxRpm: this.protocol.spindleMaxRpm,
              minRpm: this.protocol.spindleMinRpm
            });
          }
          break;
        default:
          this.emit("message", response);
      }
    });
    this.serial.on("close", () => {
      this._isConnected = false;
      this.stopPolling();
      this.emit("disconnected");
    });
    this.serial.on("error", (err) => {
      this.emit("error", err);
    });
    this.commandQueue.on("send", (data) => {
      this.emit("console", `> ${data.trim()}`);
      this.serial.write(data);
    });
    this.commandQueue.on("acknowledged", ({ command, response }) => {
      if (response.type === "ok" && /^\$\d+=/.test(command)) {
        setTimeout(() => {
          if (this._isConnected) {
            this.commandQueue.enqueue("$$", CommandPriority.NORMAL).catch(() => {
            });
          }
        }, 100);
      }
    });
    this.streaming.on("progress", (p) => this.emit("job:progress", p));
    this.streaming.on("completed", () => this.emit("job:completed"));
    this.streaming.on("state", (s) => this.emit("job:state", s));
    this.streaming.on("line-error", (e) => this.emit("job:error", e));
  }
  // --- Connection ---
  async listPorts() {
    return this.serial.listPorts();
  }
  async connect(path2, baudRate) {
    await this.serial.open({ path: path2, baudRate });
    this._isConnected = true;
    this.protocol.reset();
    this.startPolling();
    setTimeout(() => {
      if (this._isConnected) {
        this.commandQueue.enqueue("$$", CommandPriority.NORMAL).catch(() => {
        });
      }
    }, 500);
  }
  async disconnect() {
    this.stopPolling();
    this.streaming.stop();
    this.commandQueue.flush();
    await this.serial.close();
    this._isConnected = false;
  }
  get isConnected() {
    return this._isConnected;
  }
  // --- Status Polling ---
  startPolling() {
    this.statusPollTimer = setInterval(() => {
      this.serial.writeRealtime(GRBL_REALTIME_COMMANDS.STATUS_QUERY);
    }, STATUS_POLL_INTERVAL_MS);
  }
  stopPolling() {
    if (this.statusPollTimer) {
      clearInterval(this.statusPollTimer);
      this.statusPollTimer = null;
    }
  }
  // --- Realtime Commands (bypass queue) ---
  feedHold() {
    this.serial.writeRealtime(GRBL_REALTIME_COMMANDS.FEED_HOLD);
  }
  cycleStart() {
    this.serial.writeRealtime(GRBL_REALTIME_COMMANDS.CYCLE_START);
  }
  softReset() {
    this.serial.writeRealtime(GRBL_REALTIME_COMMANDS.SOFT_RESET);
    this.commandQueue.flush();
    this.protocol.reset();
  }
  jogCancel() {
    this.serial.writeRealtime(GRBL_REALTIME_COMMANDS.JOG_CANCEL);
  }
  // --- Override Commands ---
  setFeedOverride(action) {
    const map = {
      reset: GRBL_REALTIME_COMMANDS.FEED_OV_RESET,
      "increase-10": GRBL_REALTIME_COMMANDS.FEED_OV_PLUS_10,
      "decrease-10": GRBL_REALTIME_COMMANDS.FEED_OV_MINUS_10,
      "increase-1": GRBL_REALTIME_COMMANDS.FEED_OV_PLUS_1,
      "decrease-1": GRBL_REALTIME_COMMANDS.FEED_OV_MINUS_1
    };
    const byte = map[action];
    const sent = this.serial.writeRealtime(byte);
    this.emit("console", `[OV] Feed ${action} → 0x${byte.toString(16).toUpperCase()} (${sent ? "sent" : "FAILED"})`);
  }
  setRapidOverride(level) {
    const map = {
      100: GRBL_REALTIME_COMMANDS.RAPID_OV_100,
      50: GRBL_REALTIME_COMMANDS.RAPID_OV_50,
      25: GRBL_REALTIME_COMMANDS.RAPID_OV_25
    };
    const byte = map[level];
    const sent = this.serial.writeRealtime(byte);
    this.emit("console", `[OV] Rapid ${level}% → 0x${byte.toString(16).toUpperCase()} (${sent ? "sent" : "FAILED"})`);
  }
  setSpindleOverride(action) {
    const map = {
      reset: GRBL_REALTIME_COMMANDS.SPINDLE_OV_RESET,
      "increase-10": GRBL_REALTIME_COMMANDS.SPINDLE_OV_PLUS_10,
      "decrease-10": GRBL_REALTIME_COMMANDS.SPINDLE_OV_MINUS_10,
      "increase-1": GRBL_REALTIME_COMMANDS.SPINDLE_OV_PLUS_1,
      "decrease-1": GRBL_REALTIME_COMMANDS.SPINDLE_OV_MINUS_1
    };
    const byte = map[action];
    const sent = this.serial.writeRealtime(byte);
    this.emit("console", `[OV] Spindle ${action} → 0x${byte.toString(16).toUpperCase()} (${sent ? "sent" : "FAILED"})`);
  }
  toggleFloodCoolant() {
    this.serial.writeRealtime(GRBL_REALTIME_COMMANDS.COOLANT_FLOOD_TOGGLE);
  }
  toggleMistCoolant() {
    this.serial.writeRealtime(GRBL_REALTIME_COMMANDS.COOLANT_MIST_TOGGLE);
  }
  // --- Queued Commands ---
  async sendCommand(cmd) {
    return this.commandQueue.enqueue(cmd, CommandPriority.NORMAL);
  }
  async jog(axis, distance, feedRate, isMetric = true) {
    const unitCmd = isMetric ? "G21" : "G20";
    const cmd = `$J=G91 ${unitCmd} ${axis}${distance.toFixed(4)} F${feedRate}`;
    return this.commandQueue.enqueue(cmd, CommandPriority.HIGH);
  }
  async jogMulti(axes, feedRate, isMetric = true) {
    const unitCmd = isMetric ? "G21" : "G20";
    const axisStr = Object.entries(axes).filter(([, v]) => v !== 0).map(([k, v]) => `${k}${v.toFixed(4)}`).join(" ");
    if (!axisStr) return;
    const cmd = `$J=G91 ${unitCmd} ${axisStr} F${feedRate}`;
    return this.commandQueue.enqueue(cmd, CommandPriority.HIGH);
  }
  async home() {
    return this.commandQueue.enqueue("$H", CommandPriority.HIGH);
  }
  async unlock() {
    return this.commandQueue.enqueue("$X", CommandPriority.HIGH);
  }
  async probeZ(feedRate, maxDistance, retractDistance) {
    await this.commandQueue.enqueue(`G38.2 Z-${maxDistance} F${feedRate}`, CommandPriority.HIGH);
    await this.commandQueue.enqueue(`G21 G91 G0 Z${retractDistance}`, CommandPriority.HIGH);
  }
  async getGrblSettings() {
    return this.commandQueue.enqueue("$$", CommandPriority.NORMAL);
  }
  // --- Spindle ---
  async setSpindle(enabled, direction, rpm) {
    if (!enabled) {
      this.emit("console", `[CMD] Spindle OFF → M5`);
      return this.commandQueue.enqueue("M5", CommandPriority.HIGH);
    }
    const cmd = direction === "cw" ? "M3" : "M4";
    this.emit("console", `[CMD] Spindle ON → ${cmd} S${rpm}`);
    return this.commandQueue.enqueue(`${cmd} S${rpm}`, CommandPriority.HIGH);
  }
  // --- Coolant ---
  async setCoolant(flood, mist) {
    if (!flood && !mist) {
      return this.sendCommand("M9");
    }
    if (flood) await this.sendCommand("M8");
    if (mist) await this.sendCommand("M7");
  }
  // --- Job Management ---
  async startJob(lines, startFromLine = 0) {
    return this.streaming.start(lines, startFromLine);
  }
  pauseJob() {
    this.feedHold();
    this.streaming.pause();
    this.pendingSpindleStop = true;
  }
  resumeJob() {
    this.pendingSpindleStop = false;
    if (this.spindleStoppedByHold) {
      this.spindleStoppedByHold = false;
      this.serial.writeRealtime(GRBL_REALTIME_COMMANDS.SPINDLE_STOP);
      setTimeout(() => {
        this.cycleStart();
        this.streaming.resume();
      }, SPINDLE_STARTUP_DELAY_MS);
    } else {
      this.cycleStart();
      this.streaming.resume();
    }
  }
  stopJob() {
    this.pendingSpindleStop = false;
    this.spindleStoppedByHold = false;
    this.streaming.stop();
    this.softReset();
  }
  getJobState() {
    return this.streaming.getState();
  }
}
const defaults = {
  theme: "dark",
  units: "mm",
  safeHeight: 10,
  showAAxis: false,
  jogFeedRate: 1e3,
  jogStepSize: 1
};
class SettingsStoreService {
  data;
  filePath;
  constructor() {
    const userDataPath = electron.app.getPath("userData");
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    this.filePath = path.join(userDataPath, "cncstream-settings.json");
    this.data = this.load();
  }
  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, "utf-8");
        return { ...defaults, ...JSON.parse(raw) };
      }
    } catch {
    }
    return { ...defaults };
  }
  save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), "utf-8");
    } catch {
    }
  }
  getAll() {
    return { ...this.data };
  }
  get(key) {
    return this.data[key];
  }
  set(key, value) {
    this.data[key] = value;
    this.save();
  }
  setMultiple(settings) {
    Object.assign(this.data, settings);
    this.save();
  }
}
class SleepManagerService {
  blockerId = null;
  preventSleep() {
    if (this.blockerId !== null) return;
    this.blockerId = electron.powerSaveBlocker.start("prevent-app-suspension");
  }
  allowSleep() {
    if (this.blockerId === null) return;
    electron.powerSaveBlocker.stop(this.blockerId);
    this.blockerId = null;
  }
  get isPreventingSleep() {
    return this.blockerId !== null;
  }
}
let mainWindow = null;
let machineController;
let settingsStore;
let sleepManager;
electron.app.whenReady().then(() => {
  settingsStore = new SettingsStoreService();
  machineController = new MachineControllerService();
  sleepManager = new SleepManagerService();
  mainWindow = createMainWindow(settingsStore);
  if (!electron.app.isPackaged) {
    electron.globalShortcut.register("F12", () => {
      mainWindow?.webContents.toggleDevTools();
    });
  }
  registerAllIpcHandlers(mainWindow, machineController, settingsStore);
  machineController.on("status", (status) => {
    mainWindow?.webContents.send(IpcEvents.MACHINE_STATUS_UPDATE, status);
  });
  machineController.on("response", (response) => {
    mainWindow?.webContents.send(IpcEvents.MACHINE_RESPONSE, response);
  });
  machineController.on("alarm", (alarm) => {
    mainWindow?.webContents.send(IpcEvents.MACHINE_ALARM, alarm);
  });
  machineController.on("console", (line) => {
    mainWindow?.webContents.send(IpcEvents.MACHINE_CONSOLE_OUTPUT, line);
  });
  machineController.on("startup", (info) => {
    mainWindow?.webContents.send(IpcEvents.STARTUP_INFO, info);
  });
  machineController.on("spindle-config", (config) => {
    mainWindow?.webContents.send(IpcEvents.SPINDLE_CONFIG, config);
  });
  machineController.on("disconnected", () => {
    mainWindow?.webContents.send(IpcEvents.CONNECTION_STATE_CHANGED, "disconnected");
    sleepManager.allowSleep();
  });
  machineController.on("job:progress", (progress) => {
    mainWindow?.webContents.send(IpcEvents.JOB_PROGRESS_UPDATE, progress);
  });
  machineController.on("job:completed", () => {
    mainWindow?.webContents.send(IpcEvents.JOB_COMPLETED);
    sleepManager.allowSleep();
  });
  machineController.on("job:state", (state) => {
    if (state === "running") {
      sleepManager.preventSleep();
    } else if (state === "idle" || state === "completed") {
      sleepManager.allowSleep();
    }
  });
  machineController.on("job:error", (error) => {
    mainWindow?.webContents.send(IpcEvents.JOB_ERROR, error);
  });
  machineController.on("probe", (result) => {
    mainWindow?.webContents.send(IpcEvents.PROBE_RESULT, result);
  });
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow(settingsStore);
    }
  });
});
electron.app.on("window-all-closed", () => {
  machineController?.disconnect();
  sleepManager?.allowSleep();
  if (process.platform !== "darwin") {
    electron.app.quit();
  }
});
