import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface Macro {
  id: string
  name: string
  description: string
  commands: string
  builtIn?: boolean
}

interface MacroStore {
  macros: Macro[]
  addMacro: (macro: Omit<Macro, 'id'>) => void
  updateMacro: (id: string, updates: Partial<Omit<Macro, 'id' | 'builtIn'>>) => void
  deleteMacro: (id: string) => void
}

const BUILT_IN_MACROS: Macro[] = [
  {
    id: 'builtin-square-test',
    name: 'Carré test XY',
    description: 'Trace un carré de 50×50mm à partir de la position actuelle',
    commands: 'G21 G90\nG0 X0 Y0\nG1 X50 F500\nG1 Y50\nG1 X0\nG1 Y0',
    builtIn: true
  },
  {
    id: 'builtin-axes-test',
    name: 'Test axes',
    description: 'Aller-retour sur chaque axe pour vérifier les mouvements',
    commands: 'G21 G91\nG0 X20 F1000\nG0 X-20\nG0 Y20\nG0 Y-20\nG0 Z5\nG0 Z-5\nG90',
    builtIn: true
  },
  {
    id: 'builtin-go-home',
    name: 'Retour origine XY',
    description: 'Monte en Z sécurité puis revient à X0 Y0',
    commands: 'G21 G91\nG0 Z10\nG90\nG0 X0 Y0',
    builtIn: true
  }
]

export const useMacroStore = create<MacroStore>()(
  persist(
    (set, get) => ({
      macros: BUILT_IN_MACROS,

      addMacro: (macro) => {
        const newMacro: Macro = {
          ...macro,
          id: `macro-${Date.now()}`
        }
        set({ macros: [...get().macros, newMacro] })
      },

      updateMacro: (id, updates) => {
        set({
          macros: get().macros.map((m) =>
            m.id === id ? { ...m, ...updates } : m
          )
        })
      },

      deleteMacro: (id) => {
        set({ macros: get().macros.filter((m) => m.id !== id || m.builtIn) })
      }
    }),
    {
      name: 'cncstream-macros',
      partialize: (state) => ({
        macros: state.macros
      }),
      merge: (persisted: any, current) => {
        // Keep persisted macros (includes user edits to built-ins)
        // Only inject built-ins that are missing (e.g. new ones added in code updates)
        const persistedMacros: Macro[] = persisted?.macros ?? []
        const persistedIds = new Set(persistedMacros.map((m) => m.id))
        const missingBuiltIns = BUILT_IN_MACROS.filter((m) => !persistedIds.has(m.id))
        return { ...current, macros: [...persistedMacros, ...missingBuiltIns] }
      }
    }
  )
)
