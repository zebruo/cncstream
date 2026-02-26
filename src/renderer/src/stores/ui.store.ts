import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Theme = 'light' | 'dark'
type Units = 'mm' | 'in'
type CoordinateSystem = 'G54' | 'G55' | 'G56' | 'G57' | 'G58' | 'G59'
export type SpindleMode = 'pwm' | 'relay' | 'manual'
export type Language = 'fr' | 'en'

interface UIStore {
  theme: Theme
  units: Units
  safeHeight: number
  probeThickness: number
  showAAxis: boolean
  coordinateSystem: CoordinateSystem
  sidebarCollapsed: boolean
  spindleMode: SpindleMode
  helpOpen: boolean
  language: Language
  zProbeApplied: boolean

  toggleTheme: () => void
  setTheme: (theme: Theme) => void
  toggleUnits: () => void
  setUnits: (units: Units) => void
  setSafeHeight: (height: number) => void
  setProbeThickness: (thickness: number) => void
  setShowAAxis: (show: boolean) => void
  setCoordinateSystem: (cs: CoordinateSystem) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setSpindleMode: (mode: SpindleMode) => void
  setHelpOpen: (open: boolean) => void
  setLanguage: (lang: Language) => void
  setZProbeApplied: (applied: boolean) => void
}

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      units: 'mm',
      safeHeight: 10,
      probeThickness: 10,
      showAAxis: false,
      coordinateSystem: 'G54',
      sidebarCollapsed: false,
      spindleMode: 'pwm',
      helpOpen: false,
      language: 'fr',
      zProbeApplied: false,

      toggleTheme: () => set({ theme: get().theme === 'dark' ? 'light' : 'dark' }),
      setTheme: (theme) => set({ theme }),
      toggleUnits: () => set({ units: get().units === 'mm' ? 'in' : 'mm' }),
      setUnits: (units) => set({ units }),
      setSafeHeight: (height) => set({ safeHeight: height }),
      setProbeThickness: (thickness) => set({ probeThickness: thickness }),
      setShowAAxis: (show) => set({ showAAxis: show }),
      setCoordinateSystem: (cs) => set({ coordinateSystem: cs }),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setSpindleMode: (mode) => set({ spindleMode: mode }),
      setHelpOpen: (open) => set({ helpOpen: open }),
      setLanguage: (lang) => set({ language: lang }),
      setZProbeApplied: (applied) => set({ zProbeApplied: applied })
    }),
    {
      name: 'cncstream-ui',
      partialize: (state) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { helpOpen, setHelpOpen, zProbeApplied, setZProbeApplied, ...rest } = state
        return rest
      }
    }
  )
)
