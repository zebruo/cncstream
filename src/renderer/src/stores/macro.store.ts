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
    name: 'Carré test XY 200×200 (fraise 4 mm)',
    description:
      'Rainure en carré de 200×200 mm, profondeur 5 mm en 4 passes (1,5 / 3 / 4,5 / 5). Broche 12000 tr/min, avance XY 800, plongée Z 300. Z0 = surface de la pièce, départ X0 Y0',
    commands: [
      'G21 G90',
      'M3 S12000',
      'G0 Z5',
      'G0 X0 Y0',
      '(Passe 1 : Z-1.5)',
      'G1 Z-1.5 F300',
      'G1 X200 F800',
      'G1 Y200',
      'G1 X0',
      'G1 Y0',
      '(Passe 2 : Z-3)',
      'G1 Z-3 F300',
      'G1 X200 F800',
      'G1 Y200',
      'G1 X0',
      'G1 Y0',
      '(Passe 3 : Z-4.5)',
      'G1 Z-4.5 F300',
      'G1 X200 F800',
      'G1 Y200',
      'G1 X0',
      'G1 Y0',
      '(Passe 4 : Z-5)',
      'G1 Z-5 F300',
      'G1 X200 F800',
      'G1 Y200',
      'G1 X0',
      'G1 Y0',
      'G0 Z5',
      'M5'
    ].join('\n'),
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
  },
  {
    id: 'builtin-groove-l-200',
    name: 'Rainure en L 200×200 (fraise 4 mm)',
    description:
      'Rainure en L de 200 mm sur X puis 200 mm sur Y, profondeur 5 mm en 4 passes (1,5 / 3 / 4,5 / 5). Z0 = surface de la pièce, départ X0 Y0',
    commands: [
      'G21 G90',
      'M3 S12000',
      'G0 Z5',
      'G0 X0 Y0',
      '(Passe 1 : Z-1.5)',
      'G1 Z-1.5 F300',
      'G1 X200 F800',
      'G1 Y200',
      '(Passe 2 : Z-3)',
      'G1 Z-3 F300',
      'G1 Y0 F800',
      'G1 X0',
      '(Passe 3 : Z-4.5)',
      'G1 Z-4.5 F300',
      'G1 X200 F800',
      'G1 Y200',
      '(Passe 4 : Z-5)',
      'G1 Z-5 F300',
      'G1 Y0 F800',
      'G1 X0',
      'G0 Z5',
      'M5'
    ].join('\n'),
    builtIn: true
  },
  {
    id: 'builtin-groove-diagonal-200',
    name: 'Rainure diagonale 200×200 (fraise 4 mm)',
    description:
      'Rainure diagonale de X0 Y0 à X200 Y200, profondeur 5 mm en 4 passes (1,5 / 3 / 4,5 / 5). Broche 12000 tr/min, avance XY 800, plongée Z 300. Z0 = surface de la pièce',
    commands: [
      'G21 G90',
      'M3 S12000',
      'G0 Z5',
      'G0 X0 Y0',
      '(Passe 1 : Z-1.5)',
      'G1 Z-1.5 F300',
      'G1 X200 Y200 F800',
      '(Passe 2 : Z-3)',
      'G1 Z-3 F300',
      'G1 X0 Y0 F800',
      '(Passe 3 : Z-4.5)',
      'G1 Z-4.5 F300',
      'G1 X200 Y200 F800',
      '(Passe 4 : Z-5)',
      'G1 Z-5 F300',
      'G1 X0 Y0 F800',
      'G0 Z5',
      'M5'
    ].join('\n'),
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
