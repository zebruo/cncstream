import { describe, expect, it } from 'vitest'
import { usesMachineCoordinates } from './machine-coordinates'

describe('usesMachineCoordinates', () => {
  it('reconnaît G53 en début de ligne', () => {
    expect(usesMachineCoordinates('G53 G0 X225 Y225')).toBe(true)
  })

  it('reconnaît G53 après une autre commande', () => {
    expect(usesMachineCoordinates('G0 G53 X0')).toBe(true)
  })

  it('reconnaît G53 collé à son voisin, sans espace', () => {
    expect(usesMachineCoordinates('G0G53X10')).toBe(true)
  })

  it('reconnaît G053 et la casse minuscule', () => {
    expect(usesMachineCoordinates('g53 g0 x10')).toBe(true)
    expect(usesMachineCoordinates('G053 G0 X10')).toBe(true)
  })

  it('trouve G53 sur une ligne au milieu du programme', () => {
    expect(usesMachineCoordinates('G21 G90\nM3 S12000\nG53 G0 Z0\nM5')).toBe(true)
  })

  it('reconnaît G53 sur une ligne avec fins de ligne Windows', () => {
    expect(usesMachineCoordinates('G21 G90\r\nG53 G0 X1\r\n')).toBe(true)
  })

  it('ignore les programmes sans G53', () => {
    expect(usesMachineCoordinates('G21 G90\nG0 X0 Y0\nG1 Z-1 F300')).toBe(false)
    expect(usesMachineCoordinates('')).toBe(false)
  })

  it('ne confond pas avec G153, G530 ou G53.1', () => {
    expect(usesMachineCoordinates('G153 X1')).toBe(false)
    expect(usesMachineCoordinates('G530 X1')).toBe(false)
    expect(usesMachineCoordinates('G53.1')).toBe(false)
  })

  it('ne confond pas avec un autre mot qui contient 53', () => {
    expect(usesMachineCoordinates('G1 X53 Y53 F530')).toBe(false)
  })

  it('ignore G53 dans un commentaire entre parenthèses ou après un point-virgule', () => {
    expect(usesMachineCoordinates('(retour G53 au centre)\nG0 X0')).toBe(false)
    expect(usesMachineCoordinates('G0 X0 ; puis G53 plus tard')).toBe(false)
    expect(usesMachineCoordinates('G0 X0 (G53) Y1')).toBe(false)
  })

  it('voit un G53 réel même si un commentaire en parle aussi', () => {
    expect(usesMachineCoordinates('G53 G0 X0 (G53 : coordonnées machine)')).toBe(true)
  })
})
