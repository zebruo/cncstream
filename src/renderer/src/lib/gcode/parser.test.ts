import { describe, expect, it } from 'vitest'
import { parseGCode } from './parser'

describe('parseGCode : lignes', () => {
  it('gère un fichier vide', () => {
    const result = parseGCode('')
    expect(result.movements).toHaveLength(0)
    expect(result.lines).toHaveLength(1)
    expect(result.lines[0].isComment).toBe(true)
  })

  it('numérote les lignes à partir de 0 et conserve le texte brut', () => {
    const { lines } = parseGCode('G21\nG90\nG0 X1')
    expect(lines.map((l) => l.lineNumber)).toEqual([0, 1, 2])
    expect(lines.map((l) => l.raw)).toEqual(['G21', 'G90', 'G0 X1'])
  })

  it('reconnaît les lignes de commentaire et les lignes vides', () => {
    const { lines } = parseGCode('; commentaire\n(commentaire)\n\nG1 X1')
    expect(lines.map((l) => l.isComment)).toEqual([true, true, true, false])
  })

  it('accepte les fins de ligne Windows (CRLF)', () => {
    const { movements } = parseGCode('G1 X1 F100\r\nG1 X2\r\n')
    expect(movements).toHaveLength(2)
    expect(movements[1].to.x).toBe(2)
  })
})

describe('parseGCode : mots et commandes', () => {
  it('découpe les mots et les paramètres', () => {
    const [line] = parseGCode('G1 X10 Y-5.5 F300').lines
    expect(line.tokens).toEqual([
      { letter: 'G', value: 1 },
      { letter: 'X', value: 10 },
      { letter: 'Y', value: -5.5 },
      { letter: 'F', value: 300 }
    ])
    expect(line.params).toEqual({ G: 1, X: 10, Y: -5.5, F: 300 })
    expect(line.command).toBe('G1')
  })

  it('accepte les minuscules', () => {
    const { lines, movements } = parseGCode('g1 x10 f200')
    expect(lines[0].command).toBe('G1')
    expect(movements[0].to.x).toBe(10)
  })

  it('accepte un nombre terminé par un point', () => {
    const { movements } = parseGCode('G1 X10. F100')
    expect(movements[0].to.x).toBe(10)
  })

  it('donne la priorité aux mouvements G0 à G3 pour la commande de la ligne', () => {
    expect(parseGCode('G21 G1 X5').lines[0].command).toBe('G1')
    expect(parseGCode('G1 G21 X5').lines[0].command).toBe('G1')
    expect(parseGCode('G21 G90').lines[0].command).toBe('G21')
  })

  it('reconnaît une commande M', () => {
    expect(parseGCode('M3 S12000').lines[0].command).toBe('M3')
  })
})

describe('parseGCode : commentaires', () => {
  it('ignore un commentaire en fin de ligne', () => {
    const { lines, movements } = parseGCode('G1 X10 ; coupe\nG1 X20')
    expect(lines[0].params).toEqual({ G: 1, X: 10 })
    expect(movements).toHaveLength(2)
  })

  it('ignore un commentaire entre parenthèses au milieu de la ligne', () => {
    const { lines } = parseGCode('G1 (Z5 ignoré) X10')
    expect(lines[0].params).toEqual({ G: 1, X: 10 })
  })

  it('ne produit aucun mouvement pour un commentaire contenant du G-code', () => {
    const { movements } = parseGCode('; G1 X100\n(G1 X200)')
    expect(movements).toHaveLength(0)
  })
})

describe('parseGCode : mouvements', () => {
  it('calcule le mouvement entre deux positions avec avance', () => {
    const { movements } = parseGCode('G1 X10 Y5 F300')
    expect(movements).toHaveLength(1)
    expect(movements[0]).toMatchObject({
      lineIndex: 0,
      type: 'G1',
      from: { x: 0, y: 0, z: 0 },
      to: { x: 10, y: 5, z: 0 },
      feedRate: 300
    })
  })

  it('met l\'avance à 0 pour les déplacements rapides G0', () => {
    const { movements } = parseGCode('G1 X1 F500\nG0 X5')
    expect(movements[1].type).toBe('G0')
    expect(movements[1].feedRate).toBe(0)
  })

  it('garde le mode de déplacement et l\'avance d\'une ligne à l\'autre', () => {
    const { movements } = parseGCode('G1 X10 F100\nY5\nZ-1')
    expect(movements.map((m) => m.type)).toEqual(['G1', 'G1', 'G1'])
    expect(movements.map((m) => m.feedRate)).toEqual([100, 100, 100])
    expect(movements[2].to).toEqual({ x: 10, y: 5, z: -1 })
  })

  it('ne change que les axes indiqués', () => {
    const { movements } = parseGCode('G0 X10 Y20 Z5\nG1 Z-1.5 F300')
    expect(movements[1].from).toEqual({ x: 10, y: 20, z: 5 })
    expect(movements[1].to).toEqual({ x: 10, y: 20, z: -1.5 })
  })

  it('mémorise la vitesse de broche (S) pour les mouvements suivants', () => {
    const { movements } = parseGCode('M3 S12000\nG1 X1 F100')
    expect(movements[0].spindleSpeed).toBe(12000)
  })

  it('ne produit aucun mouvement pour une ligne sans axe', () => {
    const { movements } = parseGCode('G21 G90\nM3 S100\nG1 F500')
    expect(movements).toHaveLength(0)
  })

  it('indique la ligne d\'origine de chaque mouvement', () => {
    const { movements } = parseGCode('G21\n\nG1 X1 F100\n; note\nG1 X2')
    expect(movements.map((m) => m.lineIndex)).toEqual([2, 4])
  })
})

describe('parseGCode : coordonnées absolues et relatives', () => {
  it('utilise les coordonnées absolues par défaut (G90)', () => {
    const { movements } = parseGCode('G1 X10 F100\nG1 X10')
    expect(movements[1].to.x).toBe(10)
  })

  it('additionne les déplacements en mode relatif (G91)', () => {
    const { movements } = parseGCode('G91\nG0 X10\nG0 X10\nG0 Y-5')
    expect(movements.map((m) => m.to)).toEqual([
      { x: 10, y: 0, z: 0 },
      { x: 20, y: 0, z: 0 },
      { x: 20, y: -5, z: 0 }
    ])
  })

  it('revient en absolu avec G90', () => {
    const { movements } = parseGCode('G91\nG0 X10\nG90\nG0 X3')
    expect(movements[1].to.x).toBe(3)
  })

  it('traite toutes les commandes G d\'une même ligne (G21 G91 G0 X10)', () => {
    const { movements } = parseGCode('G21 G91 G0 X10\nG0 X10')
    expect(movements[0].type).toBe('G0')
    expect(movements[1].to.x).toBe(20)
  })
})

describe('parseGCode : arcs', () => {
  it('conserve le centre I, J, K d\'un arc G2', () => {
    const { movements } = parseGCode('G2 X10 Y0 I5 J0 F200')
    expect(movements[0]).toMatchObject({ type: 'G2', i: 5, j: 0 })
    expect(movements[0].r).toBeUndefined()
  })

  it('conserve le rayon R d\'un arc G3', () => {
    const { movements } = parseGCode('G3 X10 Y0 R5 F200')
    expect(movements[0]).toMatchObject({ type: 'G3', r: 5 })
  })

  it('ignore I, J, K, R hors arc', () => {
    const { movements } = parseGCode('G1 X10 I5 J5 F200')
    expect(movements[0].i).toBeUndefined()
    expect(movements[0].j).toBeUndefined()
  })
})

describe('parseGCode : macros de CNCStream', () => {
  it('lit la rainure en L (4 passes, fraise 4 mm)', () => {
    const gcode = [
      'G21 G90',
      'M3 S12000',
      'G0 Z5',
      'G0 X0 Y0',
      '(Passe 1 : Z-1.5)',
      'G1 Z-1.5 F300',
      'G1 X200 F800',
      'G1 Y200'
    ].join('\n')
    const { movements } = parseGCode(gcode)
    expect(movements.map((m) => m.type)).toEqual(['G0', 'G0', 'G1', 'G1', 'G1'])
    const last = movements[movements.length - 1]
    expect(last.to).toEqual({ x: 200, y: 200, z: -1.5 })
    expect(last.feedRate).toBe(800)
    expect(last.spindleSpeed).toBe(12000)
  })
})
