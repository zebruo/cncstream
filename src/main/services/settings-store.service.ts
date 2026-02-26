import { app } from 'electron'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

interface AppSettings {
  lastPort?: string
  lastBaudRate?: number
  lastMachineProfile?: string
  theme: 'dark' | 'light'
  units: 'mm' | 'in'
  safeHeight: number
  showAAxis: boolean
  jogFeedRate: number
  jogStepSize: number
  windowBounds?: {
    x: number
    y: number
    width: number
    height: number
  }
}

const defaults: AppSettings = {
  theme: 'dark',
  units: 'mm',
  safeHeight: 10,
  showAAxis: false,
  jogFeedRate: 1000,
  jogStepSize: 1
}

export class SettingsStoreService {
  private data: AppSettings
  private filePath: string

  constructor() {
    const userDataPath = app.getPath('userData')
    if (!existsSync(userDataPath)) {
      mkdirSync(userDataPath, { recursive: true })
    }
    this.filePath = join(userDataPath, 'cncstream-settings.json')
    this.data = this.load()
  }

  private load(): AppSettings {
    try {
      if (existsSync(this.filePath)) {
        const raw = readFileSync(this.filePath, 'utf-8')
        return { ...defaults, ...JSON.parse(raw) }
      }
    } catch {
      // Ignore parse errors, use defaults
    }
    return { ...defaults }
  }

  private save(): void {
    try {
      writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8')
    } catch {
      // Ignore write errors silently
    }
  }

  getAll(): AppSettings {
    return { ...this.data }
  }

  get<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return this.data[key]
  }

  set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    this.data[key] = value
    this.save()
  }

  setMultiple(settings: Partial<AppSettings>): void {
    Object.assign(this.data, settings)
    this.save()
  }
}