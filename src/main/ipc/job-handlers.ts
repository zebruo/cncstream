import { ipcMain } from 'electron'
import type { MachineControllerService } from '../services/machine-controller.service'
import { IpcChannels } from '@shared/types/ipc'
import type { JobOptions } from '@shared/types/job'

export function registerJobHandlers(controller: MachineControllerService): void {
  ipcMain.handle(IpcChannels.JOB_START, async (_event, lines: string[], options?: JobOptions) => {
    await controller.startJob(lines, options?.startFromLine ?? 0)
  })

  ipcMain.handle(IpcChannels.JOB_PAUSE, async () => {
    controller.pauseJob()
  })

  ipcMain.handle(IpcChannels.JOB_RESUME, async () => {
    controller.resumeJob()
  })

  ipcMain.handle(IpcChannels.JOB_STOP, async () => {
    controller.stopJob()
  })
}
