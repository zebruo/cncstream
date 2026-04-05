# CNCStream

[Lire en français](README.fr.md)

**CNC machine controller for GRBL 1.1 and grblHAL**

Desktop application built with **Electron**, **React** and **TypeScript**. Modern interface, real-time 3D visualization, full machine control via serial connection.

> **grblHAL compatibility**: CNCStream supports the base GRBL 1.1 protocol. In practice, if grblHAL is configured to remain GRBL 1.1 compatible (which is often the default), CNCStream works normally. Features exclusive to grblHAL (extended commands, JSON protocol, etc.) are not supported.

---

## Safety and Tests Before Use

> **CNCStream is machine-tool control software. Improper use can cause serious injury, material damage, or destruction of the workpiece. Read this section carefully before first use.**

### General Precautions

- Never leave the machine unattended during machining
- Keep the emergency stop button (E-Stop) within reach at all times
- Wear appropriate personal protective equipment (safety glasses, hearing protection)
- Make sure the spindle is **completely stopped** before touching the workpiece or tool
- Never disable hardware limit switches

### Checks Before First Connection

- [ ] USB cable is connected to the GRBL controller (not directly to the machine)
- [ ] Limit switches are wired and functional (`$21=1` recommended)
- [ ] Software travel limits are enabled (`$20=1`) with consistent values (`$130`, `$131`, `$132`)
- [ ] Motor current is correctly set on the drivers
- [ ] Spindle is **stopped** and VFD is powered off

### Tests in Order

#### 1. Communication Test

Connect CNCStream → verify GRBL status is received in the connection bar.
Send `$$` in the console → parameters should be displayed.

#### 2. Homing Test (`$H`)

Perform homing **without tool** and **without workpiece**:
- Ensure the machine can reach limit switches without obstruction
- Watch the direction of each axis: must move toward limit switches
- After homing, MPos should display `0.000` on homed axes

> If the machine moves away from limit switches, invert the direction (`$3`) or swap the stepper coil wiring.

#### 3. Jog Test

Test jog in incremental small step (0.1 mm) on each axis **at low speed**:
- Verify X+ moves to the right (or expected direction)
- Verify Z+ moves up (and Z- moves down)
- Test limit switches by approaching slowly: the machine should stop cleanly

#### 4. Probe Z Test

**Prerequisites**: tool in place, probe resting on the workpiece.
- Check the circuit indicator in CNCStream: must be **open** (grey) at rest
- Manually touch the top of the probe with the tool → indicator must turn **green**
- Run Probe Z while watching the descent: the spindle must descend and stop on contact
- If the machine moves up instead of down, check parameter `$3` (Z invert mask)

#### 5. Dry Run Streaming Test

Before machining a real workpiece, perform a **dry run** (spindle stopped, tool raised to safe height):
- Load a simple G-code file
- Check the dimensions shown in the analysis (min/max per axis)
- Start streaming and monitor the 3D visualizer
- Test Pause / Resume / Stop during execution

#### 6. First Machining

- Start with a soft material (wood, MDF) and conservative cutting parameters
- Stay in front of the machine with your hand on the E-Stop
- Monitor cutting noise and tool temperature

### Recommended GRBL Parameters

| Parameter | Value | Description |
|---|---|---|
| `$20` | `1` | Soft limits enabled |
| `$21` | `1` | Hard limits enabled |
| `$22` | `1` | Homing enabled |
| `$1` | `255` | Motor hold enabled (prevents position loss) |

> These values must be adapted to your machine. Refer to the GRBL documentation for the full meaning of each parameter (`$$` in the console or the Reference tab in CNCStream).

---

## Interface

| Dark mode | Light mode |
|---|---|
| ![Dark mode](docs/mode_sombre.png) | ![Light mode](docs/mode_clair.png) |

---

## Features

### Serial Connection
- Automatic detection of available COM ports
- Baud rate selection (115200 by default)
- Automatic GRBL parameter read (`$$`) on connection
- Connection status indicator in the status bar

### DRO — Digital Read-Out
- Position display on **4 axes**: X, Y, Z, A (A axis can be enabled in settings)
- **MPos / WPos** toggle (machine position / work position)
- Active work coordinate system display (G54 by default) — for single workpiece use, G54 is sufficient
- Direct position entry by clicking a value (`G10 L20` command)
- **mm or inches** display (display conversion only, machine always runs in G21)

### Jogging
- **Incremental** and **continuous** jog (hold key)
- Two independent preset grids by unit (mm / inches)
  - mm steps: 0.01 · 0.1 · 1 · 10 · 100 mm
  - inch steps: 0.001 · 0.01 · 0.05 · 0.1 · 0.5 · 1.0 in
- Keyboard shortcuts: arrows X/Y, Page Up/Down Z, `[` / `]` for step
- A+ / A- buttons for rotary axis (if enabled)

### Zero / Go To / Probe Z
- **Go to XY Zero**: raises Z (safe height), moves to X0 Y0, lowers back
- **Go to Z Zero**: lowers Z to 0
- **Home** (`$H`): full homing cycle
- **Unlock** (`$X`): unlock after alarm
- **Safe Height**: configurable clearance height for moves and probe
- Automatic surface detection via touch probe (GRBL `Pn:P` circuit)
- **Circuit indicator** real-time: open (grey) / contact detected (green)
- Probe Z button locked until circuit is validated (per-session safety)
- Descent at 50 mm/min (`G38.2 Z-20 F50`), automatic return to safe height after contact
- Configurable probe thickness field (0.1 to 50 mm)
- Confirmation dialog with Apply / Cancel option
- Workpiece Z zero applied (`G10 L20 P1`) accounting for probe thickness and safe height

### G-Code Streaming
- Load `.nc`, `.gcode`, `.tap`, `.ngc` files
- File analysis: dimensions (min/max per axis), total path, estimated time, tools, detected safe Z
- Line-by-line streaming with GRBL RX buffer management (128 bytes)
- **Start / Pause / Resume / Stop** (feed hold, cycle start, soft reset)
- Automatic spindle stop on pause and restart before axes on resume (GRBL realtime command, all modes)
- Progress bar and estimated remaining time

### 3D Visualizer
- Three.js (`@react-three/fiber`) toolpath rendering
- Green: cutting moves (G1) — Blue dashed: rapids (G0)
- Orange: already executed lines — Red cone: current position
- Navigation: rotate (left click), zoom (scroll wheel), pan (right click)

### Real-Time Overrides
- **Feed**: 10% to 200%
- **Rapid**: 25%, 50%, 100%
- **Spindle**: 10% to 200% (PWM mode)
- Reset button per override

### Spindle
- M3 (CW), M4 (CCW), M5 (stop) commands
- Three control modes:
  - **PWM**: speed controlled by GRBL, overrides active
  - **Relay**: ON/OFF output, maximum physical speed
  - **Manual**: external physical potentiometer, indicative values
- On pause: automatic spindle and axis stop; on resume: spindle restarts before axes (all modes)
- Mode badge visible in panel, tooltip on each mode

### Coolant
- Flood `M8`, Mist `M7`, Stop `M9`

### Macros
- Predefined macros (XY test square, axis test, return to XY origin) editable
- Custom macro creation with name, description and multi-line G-code sequence
- Execution via streaming mechanism (Pause/Stop functional)
- Automatic local save — macros persist after closing the application (reinstall or new PC: macros lost)

### GRBL Console
- Manual GRBL command entry
- Machine response display (ok, error, alarm, status)
- Session history

### Built-in Reference
- **GRBL error** table (error:1 to error:38)
- **GRBL alarm** table (ALARM:1 to ALARM:11)
- **GRBL parameter** table (`$$`) with description and unit
- Keyboard shortcuts

### Settings
- **Light / dark** theme
- **mm / inches** units
- **A axis** enable
- **Language**: French / English (i18n react-i18next)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop | Electron 33 |
| UI | React 19 + TypeScript |
| Build | Vite / electron-vite |
| 3D | Three.js + @react-three/fiber |
| State | Zustand |
| Serial | serialport 12 |
| i18n | i18next + react-i18next |

---

## Development Commands

### Development mode
```bash
npm run dev
```
Launches Electron + React HMR simultaneously.
`Ctrl+Shift+I` → DevTools — `Ctrl+R` → manual reload.

### Build
```bash
npm run build
```
Generates optimized files in `/out`.

### Production preview
```bash
npm run preview
```
Runs the `/out` version as if installed (requires prior build).

### Windows installer
```bash
npm run package:win
```
Build + electron-builder packaging → creates the `.exe` in `/dist`.

---

## Source Structure

```
src/
├── main/               # Electron main process
│   ├── ipc/            # IPC handlers (commands, probe, serial)
│   └── services/       # SerialPort, CommandQueue, MachineController
├── preload/            # IPC bridge renderer ↔ main
├── renderer/src/
│   ├── components/     # UI panels (DRO, Jog, Zero, Spindle, Macros…)
│   ├── stores/         # Global Zustand state (machine, UI, connection)
│   ├── locales/        # EN / FR translations
│   └── assets/         # SVG icons
└── shared/             # Types and constants shared between main/renderer
```

---

## Author

Developed with the assistance of [Claude](https://claude.ai) AI (Anthropic).

Contact: mm@nano.com
