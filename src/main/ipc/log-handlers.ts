import { ipcMain, shell } from 'electron'
import { IpcChannels } from '@shared/types/ipc'
import type { EventLogService } from '../services/event-log.service'
import type { SettingsStoreService } from '../services/settings-store.service'

export function registerLogHandlers(eventLog: EventLogService, settingsStore: SettingsStoreService): void {
  ipcMain.handle(IpcChannels.LOGS_OPEN_FOLDER, async () => {
    // openPath renvoie un message d'erreur (chaîne vide si tout va bien)
    const error = await shell.openPath(eventLog.directory)
    if (error) throw new Error(error)
  })

  ipcMain.handle(IpcChannels.LOGS_CLEAR, async () => {
    eventLog.clear()
  })

  ipcMain.handle(IpcChannels.LOGS_GET_ENABLED, async () => eventLog.isEnabled)

  ipcMain.handle(IpcChannels.LOGS_SET_ENABLED, async (_event, enabled: boolean) => {
    eventLog.setEnabled(enabled === true)
    settingsStore.set('logEnabled', eventLog.isEnabled)
  })
}
