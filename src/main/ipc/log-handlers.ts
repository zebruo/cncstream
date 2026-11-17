import { ipcMain, shell } from 'electron'
import { IpcChannels } from '@shared/types/ipc'
import type { EventLogService } from '../services/event-log.service'

export function registerLogHandlers(eventLog: EventLogService): void {
  ipcMain.handle(IpcChannels.LOGS_OPEN_FOLDER, async () => {
    // openPath renvoie un message d'erreur (chaîne vide si tout va bien)
    const error = await shell.openPath(eventLog.directory)
    if (error) throw new Error(error)
  })
}
