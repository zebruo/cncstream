import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { MACROS_VERSION, migrateMacros } from './macro-migration'

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

// Toute modification de ces macros exige d'augmenter MACROS_VERSION (macro-migration.ts)
const BUILT_IN_MACROS: Macro[] = [
  {
    id: 'builtin-square-test',
    name: 'Carré test XY 200×200 (fraise 4 mm)',
    description:
      'Rainure en carré de 200×200 mm, profondeur 5 mm en 4 passes (1,5 / 3 / 4,5 / 5). Broche 12000 tr/min, avance XY 750, plongée Z 300. Z0 = surface de la pièce, départ X0 Y0',
    commands: [
      'G21 G90',
      'M3 S12000',
      'G0 Z5',
      'G0 X0 Y0',
      '(Passe 1 : Z-1.5)',
      'G1 Z-1.5 F300',
      'G1 X200 F750',
      'G1 Y200',
      'G1 X0',
      'G1 Y0',
      '(Passe 2 : Z-3)',
      'G1 Z-3 F300',
      'G1 X200 F750',
      'G1 Y200',
      'G1 X0',
      'G1 Y0',
      '(Passe 3 : Z-4.5)',
      'G1 Z-4.5 F300',
      'G1 X200 F750',
      'G1 Y200',
      'G1 X0',
      'G1 Y0',
      '(Passe 4 : Z-5)',
      'G1 Z-5 F300',
      'G1 X200 F750',
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
      'G1 X200 F750',
      'G1 Y200',
      '(Passe 2 : Z-3)',
      'G1 Z-3 F300',
      'G1 Y0 F750',
      'G1 X0',
      '(Passe 3 : Z-4.5)',
      'G1 Z-4.5 F300',
      'G1 X200 F750',
      'G1 Y200',
      '(Passe 4 : Z-5)',
      'G1 Z-5 F300',
      'G1 Y0 F750',
      'G1 X0',
      'G0 Z5',
      'M5'
    ].join('\n'),
    builtIn: true
  },
  {
    id: 'builtin-xy-width-test',
    name: 'Test largeur X et Y (fraise 4 mm)',
    description:
      '6 traits de 100 mm, profondeur 1 mm, à faire dans de la chute. Axe Y (X0 à X40) : aller seul, retour seul, aller-retour. Axe X (Y0 à Y40, à partir de X80) : idem. Compare les largeurs pour repérer le jeu de chaque axe. Z0 = surface, départ X0 Y0',
    commands: [
      'G21 G90',
      'M3 S12000',
      'G4 P3',
      'G0 Z5',
      '(Axe Y, trait 1 en X0 : aller seul, Y0 vers Y100)',
      'G0 X0 Y0',
      'G1 Z-1 F300',
      'G1 Y100 F700',
      'G0 Z5',
      '(Axe Y, trait 2 en X20 : retour seul, Y100 vers Y0)',
      'G0 X20 Y100',
      'G1 Z-1 F300',
      'G1 Y0 F700',
      'G0 Z5',
      '(Axe Y, trait 3 en X40 : aller-retour)',
      'G0 X40 Y0',
      'G1 Z-1 F300',
      'G1 Y100 F700',
      'G1 Y0',
      'G0 Z5',
      '(Axe X, trait 4 en Y0 : aller seul, X80 vers X180)',
      'G0 X80 Y0',
      'G1 Z-1 F300',
      'G1 X180 F700',
      'G0 Z5',
      '(Axe X, trait 5 en Y20 : retour seul, X180 vers X80)',
      'G0 X180 Y20',
      'G1 Z-1 F300',
      'G1 X80 F700',
      'G0 Z5',
      '(Axe X, trait 6 en Y40 : aller-retour)',
      'G0 X80 Y40',
      'G1 Z-1 F300',
      'G1 X180 F700',
      'G1 X80',
      'G0 Z5',
      'G0 X0 Y0',
      'M5'
    ].join('\n'),
    builtIn: true
  },
  {
    id: 'builtin-diag-width-test',
    name: 'Test largeur diagonale (fraise 4 mm)',
    description:
      '4 traits de 100×100 mm, profondeur 1 mm, à faire dans de la chute : A aller seul, B retour seul, C aller-retour, D aller-retour sur l\'autre diagonale. Compare les largeurs pour repérer le jeu des axes. Z0 = surface, départ X0 Y0',
    commands: [
      'G21 G90',
      'M3 S12000',
      'G4 P3',
      'G0 Z5',
      '(A : de X0 Y0 vers X100 Y100, aller seul)',
      'G0 X0 Y0',
      'G1 Z-1 F300',
      'G1 X100 Y100 F700',
      'G0 Z5',
      '(B : de X120 Y100 vers X20 Y0, retour seul)',
      'G0 X120 Y100',
      'G1 Z-1 F300',
      'G1 X20 Y0 F700',
      'G0 Z5',
      '(C : de X40 Y0 vers X140 Y100 puis retour)',
      'G0 X40 Y0',
      'G1 Z-1 F300',
      'G1 X140 Y100 F700',
      'G1 X40 Y0',
      'G0 Z5',
      '(D : autre diagonale, de X250 Y0 vers X150 Y100 puis retour)',
      'G0 X250 Y0',
      'G1 Z-1 F300',
      'G1 X150 Y100 F700',
      'G1 X250 Y0',
      'G0 Z5',
      'G0 X0 Y0',
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
      version: MACROS_VERSION,
      migrate: (persistedState) => migrateMacros(persistedState as { macros?: Macro[] } | undefined),
      partialize: (state) => ({
        macros: state.macros
      }),
      merge: (persistedState, current) => {
        const persisted = persistedState as { macros?: Macro[] } | undefined
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
