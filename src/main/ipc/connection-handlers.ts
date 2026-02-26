import { ipcMain } from 'electron'
import type { MachineControllerService } from '../services/machine-controller.service'
import { IpcChannels } from '@shared/types/ipc'
import type { ConnectionConfig } from '@shared/types/connection'

export function registerConnectionHandlers(controller: MachineControllerService): void {
  ipcMain.handle(IpcChannels.CONNECTION_LIST_PORTS, async () => {
    return controller.listPorts()
  })

  ipcMain.handle(IpcChannels.CONNECTION_CONNECT, async (_event, config: ConnectionConfig) => {
    await controller.connect(config.path, config.baudRate)
  })

  ipcMain.handle(IpcChannels.CONNECTION_DISCONNECT, async () => {
    await controller.disconnect()
  })
}
