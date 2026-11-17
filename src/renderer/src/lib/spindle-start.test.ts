import { describe, expect, it } from 'vitest'
import { spindleStartRpm } from './spindle-start'

describe('spindleStartRpm', () => {
  it('reprend la vitesse du fichier quand elle est dans les limites', () => {
    expect(spindleStartRpm(12000, 24000)).toBe(12000)
  })

  it('plafonne à la vitesse maximale de la machine ($30)', () => {
    expect(spindleStartRpm(30000, 24000)).toBe(24000)
  })

  it('ne plafonne pas tant que $30 est inconnu (0)', () => {
    expect(spindleStartRpm(12000, 0)).toBe(12000)
  })

  it('arrondit au tour par minute', () => {
    expect(spindleStartRpm(11999.6, 24000)).toBe(12000)
    expect(spindleStartRpm(8000.4, 0)).toBe(8000)
  })

  it('renvoie 0 sans vitesse utilisable', () => {
    expect(spindleStartRpm(0, 24000)).toBe(0)
    expect(spindleStartRpm(-500, 24000)).toBe(0)
    expect(spindleStartRpm(Number.NaN, 24000)).toBe(0)
    expect(spindleStartRpm(Number.POSITIVE_INFINITY, 24000)).toBe(0)
  })
})
