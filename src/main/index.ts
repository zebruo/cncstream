import { join } from 'path'
import { app, BrowserWindow, globalShortcut } from 'electron'
import { createMainWindow } from './window'
import { registerAllIpcHandlers } from './ipc/register'
import { MachineControllerService } from './services/machine-controller.service'
import { SettingsStoreService } from './services/settings-store.service'
import { SleepManagerService } from './services/sleep-manager.service'
import { EventLogService, formatPositions } from './services/event-log.service'
import { IpcEvents } from '@shared/types/ipc'

let mainWindow: BrowserWindow | null = null
let machineController: MachineControllerService
let settingsStore: SettingsStoreService
let sleepManager: SleepManagerService
let eventLog: EventLogService

app.whenReady().then(() => {
  settingsStore = new SettingsStoreService()
  eventLog = new EventLogService(
    join(app.getPath('userData'), 'logs'),
    () => new Date(),
    settingsStore.get('logEnabled')
  )
  eventLog.log('app', `Démarrage CNCStream ${app.getVersion()} (${app.isPackaged ? 'installée' : 'développement'})`)
  machineController = new MachineControllerService()
  sleepManager = new SleepManagerService()

  mainWindow = createMainWindow(settingsStore)

  if (!app.isPackaged) {
    globalShortcut.register('CommandOrControl+Shift+I', () => {
      mainWindow?.webContents.toggleDevTools()
    })
    globalShortcut.register('CommandOrControl+R', () => {
      mainWindow?.webContents.reload()
    })
  }

  registerAllIpcHandlers(mainWindow, machineController, settingsStore, eventLog)

  // Journal des événements (fichier consultable après coup)
  // Les rapports d'état (5 Hz) ne sont pas écrits : seul un changement d'état l'est.
  const POSITION_LOG_INTERVAL_MS = 5000
  let lastMachineState = ''
  let lastPositions = ''
  let lastPositionLogAt = 0
  machineController.on('log', (category: string, message: string) => eventLog.log(category, message))
  machineController.on('connected', ({ path, baudRate }) => {
    eventLog.log('connexion', `Connecté à ${path} (${baudRate} baud)`)
  })
  machineController.on('disconnected', () => {
    eventLog.log('connexion', `Déconnecté (dernier état connu : ${lastMachineState || '?'}, ${lastPositions || 'positions inconnues'})`)
    // Nouvelle connexion = nouvel état de départ
    lastMachineState = ''
    lastPositions = ''
  })
  machineController.on('console', (line: string) => eventLog.log('machine', line))
  machineController.on('status', (status) => {
    lastPositions = formatPositions(status)
    if (status.state !== lastMachineState) {
      eventLog.log('état', `${lastMachineState || '?'} -> ${status.state} | ${lastPositions}`)
      lastMachineState = status.state
      lastPositionLogAt = Date.now()
    } else if (
      (status.state === 'Run' || status.state === 'Home') &&
      Date.now() - lastPositionLogAt >= POSITION_LOG_INTERVAL_MS
    ) {
      // Suivi d'un long déplacement : une position toutes les 5 s
      eventLog.log('position', lastPositions)
      lastPositionLogAt = Date.now()
    }
  })
  machineController.on('response', (response) => {
    eventLog.log('machine', response.type === 'ok' ? '< ok' : `< error:${response.code} ${response.message}`)
  })
  machineController.on('alarm', (alarm) => {
    eventLog.log('alarme', `ALARM:${alarm.code} ${alarm.message}`)
  })
  machineController.on('startup', (info) => {
    eventLog.log('machine', `Démarrage GRBL ${info.version}${info.isGrblHAL ? ' (grblHAL)' : ''}`)
  })
  machineController.on('homed', () => eventLog.log('machine', `Homing terminé | ${lastPositions || 'positions inconnues'}`))
  machineController.on('job:state', (state) => {
    eventLog.log('job', `État : ${state} | ${lastPositions || 'positions inconnues'}`)
  })
  machineController.on('job:completed', () => {
    eventLog.log('job', `Terminé | ${lastPositions || 'positions inconnues'}`)
  })
  machineController.on('job:error', (error) => {
    // Un arrêt vide la file : une erreur « Queue flushed » par ligne en attente serait du bruit
    if (!error.error.includes('Queue flushed')) {
      eventLog.log('job', `Erreur ligne ${error.lineNumber} « ${error.command} » : ${error.error}`)
    }
  })

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

  machineController.on('machine-config', (config) => {
    mainWindow?.webContents.send(IpcEvents.MACHINE_CONFIG, config)
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

  machineController.on('homed', () => {
    mainWindow?.webContents.send(IpcEvents.MACHINE_HOMED)
  })

  machineController.on('job:paused-on-error', (info) => {
    mainWindow?.webContents.send(IpcEvents.JOB_PAUSED_ON_ERROR, info)
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
  machineController?.disconnect().catch((error) => {
    console.error('Erreur à la déconnexion de la machine :', error)
  })
  sleepManager?.allowSleep()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
