import { describe, expect, it } from 'vitest'
import { stripGcodeComments } from './gcode-comments'

describe('stripGcodeComments', () => {
  it('laisse une ligne sans commentaire inchangée', () => {
    expect(stripGcodeComments('G1 X10 Y5 F300')).toBe('G1 X10 Y5 F300')
  })

  it('retire un commentaire ; et les espaces qui le précèdent', () => {
    expect(stripGcodeComments('G1 X10 ; coupe')).toBe('G1 X10')
    expect(stripGcodeComments('; seul')).toBe('')
  })

  it('retire les commentaires entre parenthèses', () => {
    expect(stripGcodeComments('(commentaire seul)')).toBe('')
    expect(stripGcodeComments('G0 Z5 (monte)')).toBe('G0 Z5')
    expect(stripGcodeComments('G1 (a) X1 (b) Y2').replace(/\s+/g, ' ')).toBe('G1 X1 Y2')
  })

  it('traite ; avant ( : le reste de la ligne est ignoré', () => {
    expect(stripGcodeComments('G1 X1 ;(x)')).toBe('G1 X1')
    expect(stripGcodeComments('(a;b) G1 X1')).toBe('(a')
  })

  it('conserve une parenthèse ouvrante jamais fermée', () => {
    expect(stripGcodeComments('G1 X1 (non fermé')).toBe('G1 X1 (non fermé')
    expect(stripGcodeComments('G1 ( X1')).toBe('G1 ( X1')
  })

  it('gère les parenthèses imbriquées ou accolées', () => {
    expect(stripGcodeComments('((a) b)')).toBe('b)')
    expect(stripGcodeComments('(a)(b)G1')).toBe('G1')
  })

  it('renvoie une chaîne vide pour une ligne vide ou faite d\'espaces', () => {
    expect(stripGcodeComments('')).toBe('')
    expect(stripGcodeComments('   ')).toBe('')
  })

  it('reste rapide sur des lignes pathologiques (pas de backtracking)', () => {
    const start = Date.now()
    stripGcodeComments(' '.repeat(200_000) + 'G1')
    stripGcodeComments('('.repeat(200_000))
    stripGcodeComments('(a'.repeat(100_000))
    expect(Date.now() - start).toBeLessThan(1000)
  })
})
