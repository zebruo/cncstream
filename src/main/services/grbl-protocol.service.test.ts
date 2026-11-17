import { describe, expect, it } from 'vitest'
import { GrblProtocolService, isHomingCommand } from './grbl-protocol.service'
import { GRBL_ERRORS } from '@shared/constants/grbl-errors'
import { GRBL_ALARMS } from '@shared/constants/grbl-alarms'
import type { MachineStatus } from '@shared/types/machine'

/** Analyse une ligne qui doit être un rapport de statut et renvoie ses données. */
function status(service: GrblProtocolService, line: string): MachineStatus {
  const response = service.parseLine(line)
  if (response.type !== 'status') {
    throw new Error(`Pas un statut : ${JSON.stringify(response)}`)
  }
  return response.data
}

describe('GrblProtocolService : réponses simples', () => {
  it('reconnaît ok, même avec des espaces ou un retour chariot', () => {
    const grbl = new GrblProtocolService()
    expect(grbl.parseLine('ok')).toEqual({ type: 'ok' })
    expect(grbl.parseLine('  ok\r')).toEqual({ type: 'ok' })
  })

  it('traduit un code d\'erreur connu', () => {
    const grbl = new GrblProtocolService()
    expect(grbl.parseLine('error:20')).toEqual({
      type: 'error',
      code: 20,
      message: GRBL_ERRORS[20]
    })
  })

  it('signale un code d\'erreur inconnu', () => {
    const grbl = new GrblProtocolService()
    expect(grbl.parseLine('error:999')).toEqual({
      type: 'error',
      code: 999,
      message: 'Unknown error 999'
    })
  })

  it('garde une réponse d\'erreur au code illisible (code -1) pour ne pas bloquer la file', () => {
    const grbl = new GrblProtocolService()
    expect(grbl.parseLine('error:abc')).toEqual({
      type: 'error',
      code: -1,
      message: 'Unknown error "abc"'
    })
    expect(grbl.parseLine('error:')).toEqual({
      type: 'error',
      code: -1,
      message: 'Unknown error ""'
    })
  })

  it('lit le code d\'erreur même suivi d\'un texte', () => {
    const grbl = new GrblProtocolService()
    expect(grbl.parseLine('error:20 extra')).toMatchObject({ type: 'error', code: 20 })
  })

  it('garde une alarme au code illisible (code -1)', () => {
    const grbl = new GrblProtocolService()
    expect(grbl.parseLine('ALARM:abc')).toEqual({
      type: 'alarm',
      code: -1,
      message: 'Unknown alarm "abc"',
      description: ''
    })
  })

  it('traduit une alarme connue avec son nom et sa description', () => {
    const grbl = new GrblProtocolService()
    expect(grbl.parseLine('ALARM:1')).toEqual({
      type: 'alarm',
      code: 1,
      message: GRBL_ALARMS[1].name,
      description: GRBL_ALARMS[1].description
    })
  })

  it('signale une alarme inconnue', () => {
    const grbl = new GrblProtocolService()
    expect(grbl.parseLine('ALARM:999')).toEqual({
      type: 'alarm',
      code: 999,
      message: 'Unknown alarm 999',
      description: ''
    })
  })

  it('traite un texte inconnu comme un message', () => {
    const grbl = new GrblProtocolService()
    expect(grbl.parseLine('  quelque chose  ')).toEqual({ type: 'feedback', message: 'quelque chose' })
  })
})

describe('GrblProtocolService : messages entre crochets', () => {
  it('lit un message [MSG:...]', () => {
    const grbl = new GrblProtocolService()
    expect(grbl.parseLine('[MSG:Reset to continue]')).toEqual({
      type: 'feedback',
      message: 'Reset to continue'
    })
  })

  it('garde le préfixe des lignes [GC:], [VER:], [OPT:] et [HLP:]', () => {
    const grbl = new GrblProtocolService()
    expect(grbl.parseLine('[GC:G0 G54 G17 G21 G90]')).toEqual({
      type: 'feedback',
      message: 'GC:G0 G54 G17 G21 G90'
    })
    expect(grbl.parseLine('[VER:1.1h.20190825:]')).toEqual({ type: 'feedback', message: 'VER:1.1h.20190825:' })
    expect(grbl.parseLine('[OPT:V,15,128]')).toEqual({ type: 'feedback', message: 'OPT:V,15,128' })
    expect(grbl.parseLine('[HLP:$$ $# $G]')).toEqual({ type: 'feedback', message: 'HLP:$$ $# $G' })
  })

  it('lit un résultat de sonde réussi', () => {
    const grbl = new GrblProtocolService()
    expect(grbl.parseLine('[PRB:1.000,2.000,-3.500:1]')).toEqual({
      type: 'probe',
      position: { x: 1, y: 2, z: -3.5 },
      success: true
    })
  })

  it('lit un résultat de sonde échoué', () => {
    const grbl = new GrblProtocolService()
    const response = grbl.parseLine('[PRB:0.000,0.000,0.000:0]')
    expect(response).toMatchObject({ type: 'probe', success: false })
  })
})

describe('GrblProtocolService : démarrage', () => {
  it('reconnaît Grbl', () => {
    const grbl = new GrblProtocolService()
    expect(grbl.parseLine("Grbl 1.1h ['$' for help]")).toEqual({
      type: 'startup',
      version: 'Grbl 1.1h',
      isGrblHAL: false
    })
    expect(grbl.isGrblHAL).toBe(false)
  })

  it('reconnaît grblHAL et le mémorise', () => {
    const grbl = new GrblProtocolService()
    expect(grbl.parseLine("grblHAL 1.1f ['$' or '$HELP' for help]")).toEqual({
      type: 'startup',
      version: 'grblHAL 1.1f',
      isGrblHAL: true
    })
    expect(grbl.isGrblHAL).toBe(true)
  })
})

describe('GrblProtocolService : réglages ($)', () => {
  it('lit un réglage et le mémorise', () => {
    const grbl = new GrblProtocolService()
    expect(grbl.parseLine('$110=500.000')).toEqual({ type: 'setting', key: '$110', value: '500.000' })
    expect(grbl.grblSettings['$110']).toBe('500.000')
  })

  it('coupe sur le premier « = » seulement', () => {
    const grbl = new GrblProtocolService()
    expect(grbl.parseLine('$N0=G54 G17=x')).toEqual({ type: 'setting', key: '$N0', value: 'G54 G17=x' })
  })

  it('traite « $ » sans « = » comme un message', () => {
    const grbl = new GrblProtocolService()
    expect(grbl.parseLine('$G')).toEqual({ type: 'feedback', message: '$G' })
    expect(grbl.grblSettings).toEqual({})
  })

  it('donne des valeurs par défaut de broche sans réglage', () => {
    const grbl = new GrblProtocolService()
    expect(grbl.spindleMaxRpm).toBe(1000)
    expect(grbl.spindleMinRpm).toBe(0)
  })

  it('lit les vitesses de broche max ($30) et min ($31)', () => {
    const grbl = new GrblProtocolService()
    grbl.parseLine('$30=12000')
    grbl.parseLine('$31=100')
    expect(grbl.spindleMaxRpm).toBe(12000)
    expect(grbl.spindleMinRpm).toBe(100)
  })

  it('revient aux valeurs par défaut si le réglage est illisible', () => {
    const grbl = new GrblProtocolService()
    grbl.parseLine('$30=abc')
    grbl.parseLine('$31=')
    expect(grbl.spindleMaxRpm).toBe(1000)
    expect(grbl.spindleMinRpm).toBe(0)
  })
})

describe('GrblProtocolService : course de la machine', () => {
  it("n'en donne pas tant que les trois courses manquent", () => {
    const grbl = new GrblProtocolService()
    expect(grbl.maxTravel).toBeNull()
    grbl.parseLine('$130=450.000')
    grbl.parseLine('$131=450.000')
    expect(grbl.maxTravel).toBeNull()
  })

  it('lit les courses X, Y et Z ($130, $131, $132)', () => {
    const grbl = new GrblProtocolService()
    grbl.parseLine('$130=450.000')
    grbl.parseLine('$131=300.5')
    grbl.parseLine('$132=80.000')
    expect(grbl.maxTravel).toEqual({ x: 450, y: 300.5, z: 80 })
  })

  it('ignore une course illisible', () => {
    const grbl = new GrblProtocolService()
    grbl.parseLine('$130=450')
    grbl.parseLine('$131=abc')
    grbl.parseLine('$132=80')
    expect(grbl.maxTravel).toBeNull()
  })

  it('lit le masque de sens de homing ($23), 0 par défaut', () => {
    const grbl = new GrblProtocolService()
    expect(grbl.homingDirectionInvertMask).toBe(0)
    grbl.parseLine('$23=3')
    expect(grbl.homingDirectionInvertMask).toBe(3)
  })

  it('revient à 0 si $23 est illisible', () => {
    const grbl = new GrblProtocolService()
    grbl.parseLine('$23=x')
    expect(grbl.homingDirectionInvertMask).toBe(0)
  })
})

describe('GrblProtocolService : rapport de statut', () => {
  it('lit l\'état et la position machine', () => {
    const grbl = new GrblProtocolService()
    const data = status(grbl, '<Idle|MPos:10.000,20.500,5.000|FS:0,0>')
    expect(data.state).toBe('Idle')
    expect(data.subState).toBeUndefined()
    expect(data.mpos).toEqual({ x: 10, y: 20.5, z: 5, a: 0 })
  })

  it('lit le sous-état (Hold:0, Door:1)', () => {
    const grbl = new GrblProtocolService()
    expect(status(grbl, '<Hold:0|MPos:0,0,0>')).toMatchObject({ state: 'Hold', subState: 0 })
    expect(status(grbl, '<Door:1|MPos:0,0,0>')).toMatchObject({ state: 'Door', subState: 1 })
  })

  it('lit un statut sans aucune section', () => {
    const grbl = new GrblProtocolService()
    const data = status(grbl, '<Run>')
    expect(data.state).toBe('Run')
    expect(data.mpos).toEqual({ x: 0, y: 0, z: 0, a: 0 })
  })

  it('lit un quatrième axe (A)', () => {
    const grbl = new GrblProtocolService()
    expect(status(grbl, '<Idle|MPos:1,2,3,45>').mpos).toEqual({ x: 1, y: 2, z: 3, a: 45 })
    expect(status(grbl, '<Idle|WPos:1,2,3,90>').wpos).toEqual({ x: 1, y: 2, z: 3, a: 90 })
  })

  it('ignore les sections inconnues ou sans « : »', () => {
    const grbl = new GrblProtocolService()
    const data = status(grbl, '<Idle|Foo|Truc:1,2|MPos:1,2,3>')
    expect(data.mpos).toEqual({ x: 1, y: 2, z: 3, a: 0 })
  })

  it('lit le tampon, la ligne en cours et les broches', () => {
    const grbl = new GrblProtocolService()
    const data = status(grbl, '<Run|MPos:0,0,0|Bf:15,127|Ln:42|Pn:PXY>')
    expect(data.buffer).toEqual({ planner: 15, rx: 127 })
    expect(data.lineNumber).toBe(42)
    expect(data.pins).toBe('PXY')
  })

  it('donne des broches vides et pas de numéro de ligne par défaut', () => {
    const grbl = new GrblProtocolService()
    const data = status(grbl, '<Idle|MPos:0,0,0>')
    expect(data.pins).toBe('')
    expect(data.lineNumber).toBeUndefined()
  })
})

describe('GrblProtocolService : positions pièce et machine', () => {
  it('calcule la position pièce à partir de la position machine et du décalage WCO', () => {
    const grbl = new GrblProtocolService()
    const data = status(grbl, '<Idle|MPos:10,20,5|WCO:2,4,1>')
    expect(data.wco).toEqual({ x: 2, y: 4, z: 1, a: 0 })
    expect(data.wpos).toEqual({ x: 8, y: 16, z: 4, a: 0 })
  })

  it('calcule la position machine à partir de la position pièce', () => {
    const grbl = new GrblProtocolService()
    const data = status(grbl, '<Idle|WPos:8,16,4|WCO:2,4,1>')
    expect(data.mpos).toEqual({ x: 10, y: 20, z: 5, a: 0 })
  })

  it('garde le dernier WCO connu quand un rapport ne l\'indique pas', () => {
    const grbl = new GrblProtocolService()
    status(grbl, '<Idle|MPos:10,20,5|WCO:2,4,1>')
    const data = status(grbl, '<Run|MPos:12,20,5>')
    expect(data.wco).toEqual({ x: 2, y: 4, z: 1, a: 0 })
    expect(data.wpos).toEqual({ x: 10, y: 16, z: 4, a: 0 })
  })

  it('ne recalcule rien quand MPos et WPos sont tous deux fournis', () => {
    const grbl = new GrblProtocolService()
    const data = status(grbl, '<Idle|MPos:10,20,5|WPos:99,98,97|WCO:2,4,1>')
    expect(data.mpos).toMatchObject({ x: 10, y: 20, z: 5 })
    expect(data.wpos).toMatchObject({ x: 99, y: 98, z: 97 })
  })
})

describe('GrblProtocolService : avance, broche et correcteurs', () => {
  it('lit FS : avance et vitesse de broche', () => {
    const grbl = new GrblProtocolService()
    const data = status(grbl, '<Run|MPos:0,0,0|FS:500,12000>')
    expect(data.feed).toEqual({ current: 500, programmed: 500 })
    expect(data.spindle).toMatchObject({ speed: 12000, programmed: 12000 })
  })

  it('lit F : avance seule', () => {
    const grbl = new GrblProtocolService()
    expect(status(grbl, '<Run|MPos:0,0,0|F:300>').feed).toEqual({ current: 300, programmed: 300 })
  })

  it('garde la dernière avance et vitesse de broche connues', () => {
    const grbl = new GrblProtocolService()
    status(grbl, '<Run|MPos:0,0,0|FS:500,12000>')
    const data = status(grbl, '<Run|MPos:1,0,0>')
    expect(data.feed).toEqual({ current: 500, programmed: 500 })
    expect(data.spindle.speed).toBe(12000)
  })

  it('lit les correcteurs (Ov) et les garde ensuite', () => {
    const grbl = new GrblProtocolService()
    expect(status(grbl, '<Run|MPos:0,0,0|Ov:100,50,120>').overrides).toEqual({
      feed: 100,
      rapid: 50,
      spindle: 120
    })
    expect(status(grbl, '<Run|MPos:1,0,0>').overrides).toEqual({ feed: 100, rapid: 50, spindle: 120 })
  })

  it('a des correcteurs à 100 % par défaut', () => {
    const grbl = new GrblProtocolService()
    expect(status(grbl, '<Idle|MPos:0,0,0>').overrides).toEqual({ feed: 100, rapid: 100, spindle: 100 })
  })
})

describe('GrblProtocolService : accessoires (A)', () => {
  it('lit la broche dans le sens horaire et l\'arrosage', () => {
    const grbl = new GrblProtocolService()
    const data = status(grbl, '<Run|MPos:0,0,0|Ov:100,100,100|A:SF>')
    expect(data.accessories).toEqual({ spindleCW: true, spindleCCW: false, flood: true, mist: false })
    expect(data.spindle.state).toBe('cw')
  })

  it('lit la broche dans le sens antihoraire et le brouillard', () => {
    const grbl = new GrblProtocolService()
    const data = status(grbl, '<Run|MPos:0,0,0|Ov:100,100,100|A:CM>')
    expect(data.accessories).toEqual({ spindleCW: false, spindleCCW: true, flood: false, mist: true })
    expect(data.spindle.state).toBe('ccw')
  })

  it('éteint tout quand Ov est présent sans A', () => {
    const grbl = new GrblProtocolService()
    status(grbl, '<Run|MPos:0,0,0|Ov:100,100,100|A:SF>')
    const data = status(grbl, '<Run|MPos:1,0,0|Ov:100,100,100>')
    expect(data.accessories).toEqual({ spindleCW: false, spindleCCW: false, flood: false, mist: false })
    expect(data.spindle.state).toBe('off')
  })

  it('garde l\'état précédent quand ni Ov ni A ne sont présents', () => {
    const grbl = new GrblProtocolService()
    status(grbl, '<Run|MPos:0,0,0|Ov:100,100,100|A:S>')
    const data = status(grbl, '<Run|MPos:1,0,0>')
    expect(data.accessories.spindleCW).toBe(true)
    expect(data.spindle.state).toBe('cw')
  })

  it('a tous les accessoires éteints par défaut', () => {
    const grbl = new GrblProtocolService()
    const data = status(grbl, '<Idle|MPos:0,0,0>')
    expect(data.accessories).toEqual({ spindleCW: false, spindleCCW: false, flood: false, mist: false })
    expect(data.spindle.state).toBe('off')
  })
})

describe('GrblProtocolService : reset', () => {
  it('oublie le WCO, les correcteurs, l\'avance et les accessoires', () => {
    const grbl = new GrblProtocolService()
    status(grbl, '<Run|MPos:10,20,5|WCO:2,4,1|FS:500,12000|Ov:120,50,80|A:SF>')
    grbl.reset()
    const data = status(grbl, '<Idle|MPos:10,20,5>')
    expect(data.wco).toEqual({ x: 0, y: 0, z: 0, a: 0 })
    expect(data.wpos).toEqual({ x: 10, y: 20, z: 5, a: 0 })
    expect(data.feed).toEqual({ current: 0, programmed: 0 })
    expect(data.overrides).toEqual({ feed: 100, rapid: 100, spindle: 100 })
    expect(data.accessories).toEqual({ spindleCW: false, spindleCCW: false, flood: false, mist: false })
    expect(data.spindle).toMatchObject({ speed: 0, state: 'off' })
  })
})

describe('GrblProtocolService : un statut ne modifie pas le suivant', () => {
  it('renvoie des objets indépendants d\'un rapport à l\'autre', () => {
    const grbl = new GrblProtocolService()
    status(grbl, '<Run|MPos:0,0,0|WCO:1,1,1|FS:500,12000|Ov:100,100,100|A:S>')

    // Ce rapport reprend les dernières valeurs connues : les modifier ne doit pas les altérer
    const second = status(grbl, '<Run|MPos:0,0,0>')
    second.wco.x = 999
    second.feed.current = 999
    second.spindle.speed = 999
    second.overrides.feed = 999
    second.accessories.flood = true

    const third = status(grbl, '<Run|MPos:0,0,0>')
    expect(third.wco.x).toBe(1)
    expect(third.feed.current).toBe(500)
    expect(third.spindle.speed).toBe(12000)
    expect(third.overrides.feed).toBe(100)
    expect(third.accessories.flood).toBe(false)
  })
})

describe('isHomingCommand', () => {
  it('reconnaît $H', () => {
    expect(isHomingCommand('$H')).toBe(true)
  })

  it('ignore la casse et les espaces autour', () => {
    expect(isHomingCommand('$h')).toBe(true)
    expect(isHomingCommand('  $H  ')).toBe(true)
  })

  it('ne confond pas avec les autres commandes $', () => {
    expect(isHomingCommand('$HX')).toBe(false)
    expect(isHomingCommand('$$')).toBe(false)
    expect(isHomingCommand('$X')).toBe(false)
    expect(isHomingCommand('$H=1')).toBe(false)
    expect(isHomingCommand('G28')).toBe(false)
    expect(isHomingCommand('')).toBe(false)
  })
})
