import { describe, expect, it } from 'vitest'
import { fileToolDiameter } from './tool-diameter'
import { analyzeGCode } from './analyzer'
import { parseGCode } from './parser'

describe('fileToolDiameter', () => {
  it('prend le diamètre du premier outil qui en a un', () => {
    expect(
      fileToolDiameter({
        toolInfo: [{ number: 1, name: 'sans diamètre' }, { number: 2, diameter: 6 }, { number: 3, diameter: 3 }]
      })
    ).toBe(6)
  })

  it('renvoie null sans outil ni diamètre', () => {
    expect(fileToolDiameter({ toolInfo: [] })).toBeNull()
    expect(fileToolDiameter({ toolInfo: [{ number: 1 }] })).toBeNull()
  })

  it('ignore un diamètre nul, négatif ou illisible', () => {
    expect(fileToolDiameter({ toolInfo: [{ number: 1, diameter: 0 }] })).toBeNull()
    expect(fileToolDiameter({ toolInfo: [{ number: 1, diameter: -2 }] })).toBeNull()
    expect(fileToolDiameter({ toolInfo: [{ number: 1, diameter: Number.NaN }] })).toBeNull()
  })

  it('fonctionne avec l\'analyseur : commentaire VCarve « Tool 1: 6.0mm End Mill »', () => {
    const insight = analyzeGCode(parseGCode('(Tool 1: 6.0mm End Mill)\nG21 G90\nG0 Z5\nG1 X10 F300'))
    expect(fileToolDiameter(insight)).toBe(6)
  })

  it('fonctionne avec l\'en-tête « ; Tool diameter: 4mm »', () => {
    const insight = analyzeGCode(parseGCode('; Tool diameter: 4mm\nG21 G90\nG0 Z5\nG1 X10 F300'))
    expect(fileToolDiameter(insight)).toBe(4)
  })

  it('renvoie null pour un fichier sans indication de fraise', () => {
    const insight = analyzeGCode(parseGCode('G21 G90\nG0 Z5\nG1 X10 F300'))
    expect(fileToolDiameter(insight)).toBeNull()
  })
})
