import { ipcMain } from 'electron'
import type { SettingsStoreService } from '../services/settings-store.service'
import { IpcChannels } from '@shared/types/ipc'

export function registerSettingsHandlers(settingsStore: SettingsStoreService): void {
  ipcMain.handle(IpcChannels.SETTINGS_GET, async () => {
    return settingsStore.getAll()
  })

  ipcMain.handle(IpcChannels.SETTINGS_SET, async (_event, settings: Record<string, unknown>) => {
    settingsStore.setMultiple(settings as any)
  })
}
