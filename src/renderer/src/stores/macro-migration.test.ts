import { describe, expect, it } from 'vitest'
import { MACROS_VERSION, migrateMacros } from './macro-migration'

const builtIn = (id: string) => ({ id, name: `intégrée ${id}`, builtIn: true })
const custom = (id: string) => ({ id, name: `perso ${id}` })

describe('migrateMacros', () => {
  it('retire les macros intégrées enregistrées (le code remet les siennes)', () => {
    const result = migrateMacros({
      macros: [builtIn('builtin-square-test'), builtIn('builtin-go-home')]
    })
    expect(result.macros).toEqual([])
  })

  it('conserve les macros de l\'utilisateur, dans l\'ordre et sans les modifier', () => {
    const mine = [
      { id: 'macro-1', name: 'Perçage', description: 'd', commands: 'G0 X1\nG1 Z-2' },
      custom('macro-2')
    ]
    const result = migrateMacros({ macros: [builtIn('a'), mine[0], builtIn('b'), mine[1]] })
    expect(result.macros).toEqual(mine)
  })

  it('traite builtIn absent comme une macro de l\'utilisateur', () => {
    expect(migrateMacros({ macros: [{}] }).macros).toEqual([{}])
  })

  it('supporte un stockage vide ou sans liste', () => {
    expect(migrateMacros(undefined)).toEqual({ macros: [] })
    expect(migrateMacros({})).toEqual({ macros: [] })
  })

  it('ne modifie pas l\'objet reçu', () => {
    const input = { macros: [builtIn('a'), custom('b')] }
    migrateMacros(input)
    expect(input.macros).toHaveLength(2)
  })

  it('la version est un entier positif (0 = avant le versionnage)', () => {
    expect(Number.isInteger(MACROS_VERSION)).toBe(true)
    expect(MACROS_VERSION).toBeGreaterThanOrEqual(1)
  })
})
