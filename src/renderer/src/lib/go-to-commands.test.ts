import { describe, expect, it } from 'vitest'
import { goToPositionCommands, goToXYZeroCommands } from './go-to-commands'

/** Mode de déplacement actif à la fin d'une suite de commandes (G90 absolu / G91 relatif). */
function finalDistanceMode(commands: string[]): 'G90' | 'G91' | null {
  let mode: 'G90' | 'G91' | null = null
  for (const command of commands) {
    for (const word of command.split(/\s+/)) {
      if (word === 'G90' || word === 'G91') mode = word
    }
  }
  return mode
}

describe('goToXYZeroCommands', () => {
  it('monte, va à X0 Y0, redescend, puis rétablit le mode absolu', () => {
    expect(goToXYZeroCommands(5)).toEqual([
      'G21 G91 G0 Z5',
      'G90 G0 X0 Y0',
      'G21 G91 G0 Z-5',
      'G90'
    ])
  })

  it('ne laisse pas la machine en mode relatif', () => {
    expect(finalDistanceMode(goToXYZeroCommands(5))).toBe('G90')
  })

  it('reprend la hauteur de sécurité fournie, décimales comprises', () => {
    const commands = goToXYZeroCommands(2.5)
    expect(commands[0]).toBe('G21 G91 G0 Z2.5')
    expect(commands[2]).toBe('G21 G91 G0 Z-2.5')
  })
})

describe('goToPositionCommands', () => {
  it('avec X et Y seulement : dégagement, déplacement, redescente, G90', () => {
    expect(goToPositionCommands({ x: 10, y: 20 }, 5)).toEqual([
      'G21 G91 G0 Z5',
      'G90 G0 X10 Y20',
      'G21 G91 G0 Z-5',
      'G90'
    ])
  })

  it('avec X seul ou Y seul : ne cite que cet axe', () => {
    expect(goToPositionCommands({ x: 10 }, 5)[1]).toBe('G90 G0 X10')
    expect(goToPositionCommands({ y: -3 }, 5)[1]).toBe('G90 G0 Y-3')
  })

  it('avec un Z : un seul déplacement direct, sans passage en relatif', () => {
    const commands = goToPositionCommands({ z: 0 }, 5)
    expect(commands).toEqual(['G90 G0 Z0'])
    expect(finalDistanceMode(commands)).toBe('G90')
  })

  it('accepte une position à zéro (0 n\'est pas « absent »)', () => {
    expect(goToPositionCommands({ x: 0, y: 0 }, 5)[1]).toBe('G90 G0 X0 Y0')
  })

  it('ne laisse jamais la machine en mode relatif', () => {
    for (const position of [{ x: 1 }, { y: 1 }, { x: 1, y: 1 }, { z: 1 }, { x: 1, z: 1 }]) {
      expect(finalDistanceMode(goToPositionCommands(position, 5))).toBe('G90')
    }
  })
})
