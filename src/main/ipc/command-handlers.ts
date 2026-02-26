import { ipcMain } from 'electron'
import type { MachineControllerService } from '../services/machine-controller.service'
import { IpcChannels } from '@shared/types/ipc'
import type { JogParams, SpindleParams, CoolantParams, OverrideAction, RapidOverrideLevel, ProbeZParams } from '@shared/types/ipc'

export function registerCommandHandlers(controller: MachineControllerService): void {
  ipcMain.handle(IpcChannels.COMMAND_SEND, async (_event, cmd: string) => {
    await controller.sendCommand(cmd)
  })

  ipcMain.handle(IpcChannels.COMMAND_JOG, async (_event, params: JogParams) => {
    const axes: Record<string, number> = {}
    if (params.x !== undefined) axes['X'] = params.x
    if (params.y !== undefined) axes['Y'] = params.y
    if (params.z !== undefined) axes['Z'] = params.z
    if (params.a !== undefined) axes['A'] = params.a
    await controller.jogMulti(axes, params.feedRate, params.isMetric ?? true)
  })

  ipcMain.handle(IpcChannels.COMMAND_JOG_CANCEL, async () => {
    controller.jogCancel()
  })

  ipcMain.handle(IpcChannels.COMMAND_HOME, async () => {
    await controller.home()
  })

  ipcMain.handle(IpcChannels.COMMAND_UNLOCK, async () => {
    await controller.unlock()
  })

  ipcMain.handle(IpcChannels.COMMAND_RESET, async () => {
    controller.softReset()
  })

  ipcMain.handle(IpcChannels.COMMAND_FEED_HOLD, async () => {
    controller.feedHold()
  })

  ipcMain.handle(IpcChannels.COMMAND_CYCLE_START, async () => {
    controller.cycleStart()
  })

  // Overrides
  ipcMain.handle(IpcChannels.OVERRIDE_FEED, async (_event, action: OverrideAction) => {
    controller.setFeedOverride(action)
  })

  ipcMain.handle(IpcChannels.OVERRIDE_RAPID, async (_event, level: RapidOverrideLevel) => {
    controller.setRapidOverride(level)
  })

  ipcMain.handle(IpcChannels.OVERRIDE_SPINDLE, async (_event, action: OverrideAction) => {
    controller.setSpindleOverride(action)
  })

  // Spindle / Coolant
  ipcMain.handle(IpcChannels.SPINDLE_SET, async (_event, params: SpindleParams) => {
    await controller.setSpindle(params.enabled, params.direction, params.rpm)
  })

  ipcMain.handle(IpcChannels.COOLANT_SET, async (_event, params: CoolantParams) => {
    await controller.setCoolant(params.flood, params.mist)
  })

  // GRBL Settings
  ipcMain.handle(IpcChannels.SETTINGS_GET_GRBL, async () => {
    await controller.getGrblSettings()
  })

  // Probe
  ipcMain.handle(IpcChannels.COMMAND_PROBE_Z, async (_event, params: ProbeZParams) => {
    await controller.probeZ(params.feedRate, params.maxDistance, params.retractDistance)
  })
}
