import { describe, expect, it } from 'vitest'
import { analyzeGCode } from './analyzer'
import { parseGCode } from './parser'

const analyze = (gcode: string) => analyzeGCode(parseGCode(gcode))

describe('analyzeGCode : fichier vide', () => {
  it('renvoie des valeurs neutres, jamais Infinity ni NaN', () => {
    const insight = analyze('')
    expect(insight.lineCount).toBe(0)
    expect(insight.movementCount).toBe(0)
    expect(insight.feedRange).toEqual({ min: 0, max: 0 })
    expect(insight.spindleRange).toEqual({ min: 0, max: 0 })
    expect(insight.boundingBox.min).toEqual({ x: 0, y: 0, z: 0 })
    expect(insight.boundingBox.max).toEqual({ x: 0, y: 0, z: 0 })
    expect(insight.dimensions).toEqual({ x: 0, y: 0, z: 0 })
    expect(insight.estimatedTimeSeconds).toBe(0)
    expect(insight.toolsUsed).toEqual([])
    expect(insight.safeZ).toBeNull()
    expect(insight.stockThickness).toBeNull()
    expect(insight.operationCount).toBe(0)
    expect(insight.passCount).toBe(0)
    expect(insight.passDepth).toBeNull()
    expect(insight.hasTCommands).toBe(false)
  })
})

describe('analyzeGCode : comptages', () => {
  it('compte les lignes de code, sans les commentaires ni les lignes vides', () => {
    const insight = analyze('G21\n; commentaire\n(commentaire)\n\nG1 X1 F100\n  G0 Z5 ; fin')
    expect(insight.lineCount).toBe(3)
  })

  it('compte les mouvements', () => {
    expect(analyze('G21\nG1 X1 F100\nG1 Y1\nM5').movementCount).toBe(2)
  })
})

describe('analyzeGCode : boîte englobante', () => {
  it('inclut l\'origine de départ et calcule les dimensions', () => {
    const insight = analyze('G1 X10 Y20 Z-5 F100')
    expect(insight.boundingBox.min).toEqual({ x: 0, y: 0, z: -5 })
    expect(insight.boundingBox.max).toEqual({ x: 10, y: 20, z: 0 })
    expect(insight.dimensions).toEqual({ x: 10, y: 20, z: 5 })
  })

  it('gère les coordonnées négatives', () => {
    const insight = analyze('G1 X-10 Y-20 F100\nG1 X40')
    expect(insight.boundingBox.min).toMatchObject({ x: -10, y: -20 })
    expect(insight.boundingBox.max).toMatchObject({ x: 40, y: 0 })
    expect(insight.dimensions.x).toBe(50)
  })
})

describe('analyzeGCode : avances et broche', () => {
  it('relève les avances min et max des seuls déplacements de coupe', () => {
    const insight = analyze('G0 X5\nG1 X10 F300\nG1 X20 F800\nG1 X30 F500')
    expect(insight.feedRange).toEqual({ min: 300, max: 800 })
  })

  it('relève les vitesses de broche min et max', () => {
    const insight = analyze('M3 S8000\nG1 X1 F100\nS12000\nG1 X2')
    expect(insight.spindleRange).toEqual({ min: 8000, max: 12000 })
  })
})

describe('analyzeGCode : temps estimé', () => {
  it('divise la distance par l\'avance : 100 mm à 6000 mm/min = 1 s', () => {
    const insight = analyze('G1 X100 F6000')
    expect(insight.estimatedTimeSeconds).toBeCloseTo(1, 5)
  })

  it('utilise 5000 mm/min pour les déplacements rapides : 500 mm = 6 s', () => {
    const insight = analyze('G0 X500')
    expect(insight.estimatedTimeSeconds).toBeCloseTo(6, 5)
  })

  it('prend en compte les trois axes', () => {
    const insight = analyze('G1 X3 Y4 Z0 F300')
    // distance 5 mm à 5 mm/s
    expect(insight.estimatedTimeSeconds).toBeCloseTo(1, 5)
  })

  it('ne compte aucun temps pour un déplacement de coupe sans avance', () => {
    expect(analyze('G1 X100').estimatedTimeSeconds).toBe(0)
  })
})

describe('analyzeGCode : Z de dégagement', () => {
  it('relève la hauteur atteinte par un rapide qui monte', () => {
    expect(analyze('G0 Z5\nG0 X10').safeZ).toBe(5)
  })

  it('ignore les rapides qui descendent', () => {
    expect(analyze('G1 Z-2 F100\nG0 Z-5').safeZ).toBeNull()
  })

  it('arrondit les valeurs flottantes', () => {
    expect(analyze('G0 Z5.0004').safeZ).toBe(5)
  })
})

describe('analyzeGCode : outils', () => {
  it('lit une commande T du programme', () => {
    const insight = analyze('T1 M6\nG1 X1 F100')
    expect(insight.toolsUsed).toEqual([1])
    expect(insight.hasTCommands).toBe(true)
    expect(insight.toolInfo).toEqual([{ number: 1 }])
  })

  it('trie les outils par numéro', () => {
    const insight = analyze('T3 M6\nT1 M6\nT2 M6')
    expect(insight.toolsUsed).toEqual([1, 2, 3])
  })

  it('n\'invente pas de commande T à partir d\'un commentaire', () => {
    const insight = analyze('; T1 6mm flat endmill\nG1 X1 F100')
    expect(insight.toolsUsed).toEqual([1])
    expect(insight.hasTCommands).toBe(false)
  })

  it('lit le diamètre et le nom au format Fusion 360', () => {
    const insight = analyze('(T1  D=6. CR=0. - ZMIN=-5. - flat end mill)\nG1 X1 F100')
    expect(insight.toolInfo).toEqual([{ number: 1, diameter: 6, name: 'flat end mill' }])
  })

  it('lit un diamètre décimal après D=', () => {
    const insight = analyze('(T2 D=3.175 - ball nose)')
    expect(insight.toolInfo[0]).toMatchObject({ number: 2, diameter: 3.175, name: 'ball nose' })
  })

  it('lit un diamètre en mm dans un commentaire générique', () => {
    const insight = analyze('; T2 6mm flat endmill')
    expect(insight.toolInfo).toEqual([{ number: 2, diameter: 6 }])
  })

  it('lit un diamètre décimal avec espace avant mm', () => {
    const insight = analyze('; T1 4.5 mm fraise')
    expect(insight.toolInfo[0].diameter).toBe(4.5)
  })

  it('ne confond pas la fin d\'une longue suite de chiffres avec un diamètre', () => {
    const insight = analyze('; T1 12345 mm')
    expect(insight.toolInfo[0].diameter).toBe(12345)
  })

  it('lit le diamètre de l\'en-tête Box Generator (sans numéro d\'outil)', () => {
    const insight = analyze('; Tool diameter: 4mm\nG1 X1 F100')
    expect(insight.toolsUsed).toEqual([1])
    expect(insight.toolInfo).toEqual([{ number: 1, diameter: 4 }])
  })

  it('lit le diamètre de l\'en-tête Fusion 360 TOOL/MILL', () => {
    const insight = analyze('(TOOL/MILL,3.175,0,12,0)\nG1 X1 F100')
    expect(insight.toolInfo).toEqual([{ number: 1, diameter: 3.175 }])
  })

  it('garde le premier diamètre d\'en-tête', () => {
    const insight = analyze('; Tool diameter: 4mm\n; Tool diameter: 6mm')
    expect(insight.toolInfo).toEqual([{ number: 1, diameter: 4 }])
  })

  it('lit le nom au format « Tool N: description » quand le commentaire contient aussi T<n>', () => {
    const insight = analyze('; T1 Tool 1: fraise 6mm')
    expect(insight.toolInfo).toEqual([{ number: 1, diameter: 6, name: 'fraise 6mm' }])
  })

  // Limite connue : le commentaire VCarve « (Tool 1: 6.0mm End Mill) » est cité dans le code
  // comme format pris en charge, mais il n'est pas lu s'il ne contient pas aussi « T1 ».
  it.todo('lit le nom et le diamètre au format VCarve « (Tool 1: 6.0mm End Mill) »')

  it('reste rapide sur des commentaires pathologiques (pas de backtracking)', () => {
    const start = Date.now()
    analyze('(T1 D=6 - fraise' + ' '.repeat(100_000) + ')')
    analyze('; T1 ' + '1'.repeat(50_000))
    expect(Date.now() - start).toBeLessThan(1000)
  })
})

describe('analyzeGCode : épaisseur de la pièce', () => {
  it('lit « ; Brut: 19mm » (Box Generator)', () => {
    expect(analyze('; Brut: 19mm').stockThickness).toBe(19)
  })

  it('accepte des espaces et des décimales', () => {
    expect(analyze('; Brut : 18.5 mm').stockThickness).toBe(18.5)
  })

  it('lit STOCK/BLOCK (Fusion 360) : troisième valeur', () => {
    expect(analyze('(STOCK/BLOCK,150,100,6.5,0,0,0)').stockThickness).toBe(6.5)
  })

  it('garde la première valeur trouvée', () => {
    const insight = analyze('; Brut: 19mm\n(STOCK/BLOCK,150,100,6.5,0,0,0)')
    expect(insight.stockThickness).toBe(19)
  })

  it('renvoie null sans déclaration', () => {
    expect(analyze('G1 X1 F100\n; autre commentaire').stockThickness).toBeNull()
  })
})

describe('analyzeGCode : opérations et passes (commentaires structurés)', () => {
  it('compte les opérations Box Generator et leurs passes', () => {
    const gcode = [
      '; ─── Poche ───',
      '; Passe 1/3',
      'G1 Z-1 F100',
      '; Passe 2/3',
      'G1 Z-2',
      '; ─── Contour ───',
      '; Passe 1/2',
      'G1 Z-3'
    ].join('\n')
    const insight = analyze(gcode)
    expect(insight.operationCount).toBe(2)
    expect(insight.passCount).toBe(5)
  })

  it('reconnaît les opérations Fusion 360 et VCarve', () => {
    const gcode = [
      '(Operation: Face)',
      '; Passe 1/2',
      '; Toolpath: Pocket',
      '; Passe 1/4'
    ].join('\n')
    const insight = analyze(gcode)
    expect(insight.operationCount).toBe(2)
    expect(insight.passCount).toBe(6)
  })

  it('utilise le nombre total de passes indiqué dans « Passe N/M »', () => {
    const insight = analyze('; ─── Op ───\n; Passe 1/5')
    expect(insight.passCount).toBe(5)
  })
})

describe('analyzeGCode : passes déduites des niveaux Z (repli)', () => {
  it('déduit les passes et leur profondeur quand elles sont régulières', () => {
    const insight = analyze('G1 Z-1 F100\nG1 X10\nG1 Z-2\nG1 X0\nG1 Z-3')
    expect(insight.operationCount).toBe(1)
    expect(insight.passCount).toBe(3)
    expect(insight.passDepth).toBe(1)
  })

  it('ne donne pas de profondeur de passe si les passes sont irrégulières', () => {
    // Rainure 5 mm : passes à 1,5 / 3 / 4,5 / 5
    const insight = analyze('G1 Z-1.5 F300\nG1 Z-3\nG1 Z-4.5\nG1 Z-5')
    expect(insight.passCount).toBe(4)
    expect(insight.passDepth).toBeNull()
  })

  it('compte une seule passe sans profondeur de passe', () => {
    const insight = analyze('G1 Z-2 F100\nG1 X10')
    expect(insight.operationCount).toBe(1)
    expect(insight.passCount).toBe(1)
    expect(insight.passDepth).toBeNull()
  })

  it('ne compte aucune passe sans coupe en dessous de Z0', () => {
    const insight = analyze('G0 Z5\nG1 X10 F100')
    expect(insight.operationCount).toBe(0)
    expect(insight.passCount).toBe(0)
  })

  it('ne compte pas les plongées rapides G0 comme des passes', () => {
    const insight = analyze('G0 Z-5\nG0 X10')
    expect(insight.passCount).toBe(0)
  })
})

describe('analyzeGCode : macros de CNCStream', () => {
  it('analyse la rainure en L (broche 12000, F800, 4 passes jusqu\'à 5 mm)', () => {
    const gcode = [
      'G21 G90',
      'M3 S12000',
      'G0 Z5',
      'G0 X0 Y0',
      'G1 Z-1.5 F300',
      'G1 X200 F800',
      'G1 Y200',
      'G1 Z-3 F300',
      'G1 Y0 F800',
      'G1 X0',
      'G1 Z-4.5 F300',
      'G1 X200 F800',
      'G1 Y200',
      'G1 Z-5 F300',
      'G1 Y0 F800',
      'G1 X0',
      'G0 Z5',
      'M5'
    ].join('\n')
    const insight = analyze(gcode)
    expect(insight.feedRange).toEqual({ min: 300, max: 800 })
    expect(insight.spindleRange).toEqual({ min: 12000, max: 12000 })
    expect(insight.boundingBox.min.z).toBe(-5)
    expect(insight.dimensions).toMatchObject({ x: 200, y: 200, z: 10 })
    expect(insight.passCount).toBe(4)
    expect(insight.safeZ).toBe(5)
  })
})
