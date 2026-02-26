import { ipcMain, dialog, BrowserWindow } from 'electron'
import { readFile } from 'fs/promises'
import { IpcChannels } from '@shared/types/ipc'

export function registerFileHandlers(mainWindow: BrowserWindow): void {
  ipcMain.handle(IpcChannels.FILE_OPEN_DIALOG, async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'G-Code Files', extensions: ['gcode', 'nc', 'ngc', 'tap', 'cnc', 'gc', 'ncc'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    const filePath = result.filePaths[0]
    const content = await readFile(filePath, 'utf-8')
    return { path: filePath, content }
  })

  ipcMain.handle(IpcChannels.FILE_READ, async (_event, filePath: string) => {
    return readFile(filePath, 'utf-8')
  })
}
