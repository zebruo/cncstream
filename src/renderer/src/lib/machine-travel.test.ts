import { describe, expect, it } from 'vitest'
import { travelBoundsInWork } from './machine-travel'

const NO_OFFSET = { x: 0, y: 0, z: 0 }

describe('travelBoundsInWork', () => {
  it('par défaut, homing vers le positif : la course va de −T à 0', () => {
    const bounds = travelBoundsInWork(
      { travel: { x: 450, y: 300, z: 80 }, homingInvertMask: 0 },
      NO_OFFSET
    )
    expect(bounds.min).toEqual({ x: -450, y: -300, z: -80 })
    expect(bounds.max).toEqual({ x: 0, y: 0, z: 0 })
  })

  it('bit à 1 : l\'axe fait son homing vers le négatif, la course va de 0 à +T', () => {
    const bounds = travelBoundsInWork(
      { travel: { x: 450, y: 450, z: 80 }, homingInvertMask: 0b001 },
      NO_OFFSET
    )
    expect(bounds.min.x).toBe(0)
    expect(bounds.max.x).toBe(450)
    // Y et Z n'ont pas leur bit : course négative
    expect(bounds.min.y).toBe(-450)
    expect(bounds.max.y).toBe(0)
  })

  it('chaque axe lit son propre bit (X = 1, Y = 2, Z = 4)', () => {
    const bounds = travelBoundsInWork(
      { travel: { x: 10, y: 20, z: 30 }, homingInvertMask: 0b100 },
      NO_OFFSET
    )
    expect(bounds.max.x).toBe(0)
    expect(bounds.max.y).toBe(0)
    expect(bounds.min.z).toBe(0)
    expect(bounds.max.z).toBe(30)
  })

  it('cas de la machine de l\'utilisateur : $23=3, X et Y de 0 à 450, Z de −80 à 0', () => {
    const bounds = travelBoundsInWork(
      { travel: { x: 450, y: 450, z: 80 }, homingInvertMask: 3 },
      NO_OFFSET
    )
    expect(bounds.min).toEqual({ x: 0, y: 0, z: -80 })
    expect(bounds.max).toEqual({ x: 450, y: 450, z: 0 })
  })

  it('retire le décalage de travail : pièce = machine − WCO', () => {
    // Zéro pièce posé à la position machine (141, 61, −66,1) : la zone se décale d'autant
    const bounds = travelBoundsInWork(
      { travel: { x: 450, y: 450, z: 80 }, homingInvertMask: 3 },
      { x: 141, y: 61, z: -66.1 }
    )
    expect(bounds.min.x).toBeCloseTo(-141)
    expect(bounds.max.x).toBeCloseTo(309)
    expect(bounds.min.y).toBeCloseTo(-61)
    expect(bounds.max.y).toBeCloseTo(389)
    expect(bounds.min.z).toBeCloseTo(-13.9)
    expect(bounds.max.z).toBeCloseTo(66.1)
  })

  it('contient toujours la position courante de l\'outil (le zéro pièce est dedans)', () => {
    const wco = { x: 141, y: 61, z: -66.1 }
    const bounds = travelBoundsInWork(
      { travel: { x: 450, y: 450, z: 80 }, homingInvertMask: 3 },
      wco
    )
    // Position machine (141, 61, −66,1) = pièce (0, 0, 0)
    for (const axis of ['x', 'y', 'z'] as const) {
      expect(bounds.min[axis]).toBeLessThanOrEqual(0)
      expect(bounds.max[axis]).toBeGreaterThanOrEqual(0)
    }
  })

  it('une course nulle donne une zone réduite à un point (pas d\'erreur)', () => {
    const bounds = travelBoundsInWork(
      { travel: { x: 0, y: 0, z: 0 }, homingInvertMask: 0 },
      NO_OFFSET
    )
    for (const axis of ['x', 'y', 'z'] as const) {
      expect(bounds.min[axis]).toBeCloseTo(bounds.max[axis])
    }
  })
})
