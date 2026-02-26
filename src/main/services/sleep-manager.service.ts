import { powerSaveBlocker } from 'electron'

export class SleepManagerService {
  private blockerId: number | null = null

  preventSleep(): void {
    if (this.blockerId !== null) return
    this.blockerId = powerSaveBlocker.start('prevent-app-suspension')
  }

  allowSleep(): void {
    if (this.blockerId === null) return
    powerSaveBlocker.stop(this.blockerId)
    this.blockerId = null
  }

  get isPreventingSleep(): boolean {
    return this.blockerId !== null
  }
}
