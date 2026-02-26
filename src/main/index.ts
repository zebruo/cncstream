import { app, BrowserWindow, globalShortcut } from 'electron'
import { createMainWindow } from './window'
import { registerAllIpcHandlers } from './ipc/register'
import { MachineControllerService } from './services/machine-controller.service'
import { SettingsStoreService } from './services/settings-store.service'
import { SleepManagerService } from './services/sleep-manager.service'
import { IpcEvents } from '@shared/types/ipc'

let mainWindow: BrowserWindow | null = null
let machineController: MachineControllerService
let settingsStore: SettingsStoreService
let sleepManager: SleepManagerService

app.whenReady().then(() => {
  settingsStore = new SettingsStoreService()
  machineController = new MachineControllerService()
  sleepManager = new SleepManagerService()

  mainWindow = createMainWindow(settingsStore)

  if (!app.isPackaged) {
    globalShortcut.register('F12', () => {
      mainWindow?.webContents.toggleDevTools()
    })
  }

  registerAllIpcHandlers(mainWindow, machineController, settingsStore)

  // Forward machine events to renderer
  machineController.on('status', (status) => {
    mainWindow?.webContents.send(IpcEvents.MACHINE_STATUS_UPDATE, status)
  })

  machineController.on('response', (response) => {
    mainWindow?.webContents.send(IpcEvents.MACHINE_RESPONSE, response)
  })

  machineController.on('alarm', (alarm) => {
    mainWindow?.webContents.send(IpcEvents.MACHINE_ALARM, alarm)
  })

  machineController.on('console', (line) => {
    mainWindow?.webContents.send(IpcEvents.MACHINE_CONSOLE_OUTPUT, line)
  })

  machineController.on('startup', (info) => {
    mainWindow?.webContents.send(IpcEvents.STARTUP_INFO, info)
  })

  machineController.on('spindle-config', (config) => {
    mainWindow?.webContents.send(IpcEvents.SPINDLE_CONFIG, config)
  })

  machineController.on('disconnected', () => {
    mainWindow?.webContents.send(IpcEvents.CONNECTION_STATE_CHANGED, 'disconnected')
    sleepManager.allowSleep()
  })

  machineController.on('job:progress', (progress) => {
    mainWindow?.webContents.send(IpcEvents.JOB_PROGRESS_UPDATE, progress)
  })

  machineController.on('job:completed', () => {
    mainWindow?.webContents.send(IpcEvents.JOB_COMPLETED)
    sleepManager.allowSleep()
  })

  machineController.on('job:state', (state) => {
    if (state === 'running') {
      sleepManager.preventSleep()
    } else if (state === 'idle' || state === 'completed') {
      sleepManager.allowSleep()
    }
  })

  machineController.on('job:error', (error) => {
    mainWindow?.webContents.send(IpcEvents.JOB_ERROR, error)
  })

  machineController.on('probe', (result) => {
    mainWindow?.webContents.send(IpcEvents.PROBE_RESULT, result)
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow(settingsStore)
    }
  })
})

app.on('window-all-closed', () => {
  machineController?.disconnect()
  sleepManager?.allowSleep()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
