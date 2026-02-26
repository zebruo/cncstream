import type { BrowserWindow } from 'electron'
import { registerConnectionHandlers } from './connection-handlers'
import { registerCommandHandlers } from './command-handlers'
import { registerFileHandlers } from './file-handlers'
import { registerSettingsHandlers } from './settings-handlers'
import { registerJobHandlers } from './job-handlers'
import type { MachineControllerService } from '../services/machine-controller.service'
import type { SettingsStoreService } from '../services/settings-store.service'

export function registerAllIpcHandlers(
  mainWindow: BrowserWindow,
  machineController: MachineControllerService,
  settingsStore: SettingsStoreService
): void {
  registerConnectionHandlers(machineController)
  registerCommandHandlers(machineController)
  registerFileHandlers(mainWindow)
  registerSettingsHandlers(settingsStore)
  registerJobHandlers(machineController)
}
