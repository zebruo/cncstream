import { describe, expect, it } from 'vitest'
import { cleanErrorMessage, describeConnectionError } from './connection-errors'

const RAW_NOT_FOUND =
  "Error invoking remote method 'connection:connect': Error: Opening COM3: File not found"

describe('cleanErrorMessage', () => {
  it("retire le préfixe d'Electron et le « Error: » qui suit", () => {
    expect(cleanErrorMessage(RAW_NOT_FOUND)).toBe('Opening COM3: File not found')
  })

  it('laisse un message sans préfixe tel quel', () => {
    expect(cleanErrorMessage('Port fermé')).toBe('Port fermé')
  })

  it('retire plusieurs « Error: » successifs', () => {
    expect(cleanErrorMessage('Error: Error: boom')).toBe('boom')
  })

  it('ignore les espaces autour', () => {
    expect(cleanErrorMessage('  Port fermé \n')).toBe('Port fermé')
  })

  it("garde le message si le préfixe n'a pas la forme attendue", () => {
    expect(cleanErrorMessage('Error invoking remote method sans fin')).toBe(
      'Error invoking remote method sans fin'
    )
  })
})

describe('describeConnectionError', () => {
  it('reconnaît un port introuvable, avec son nom', () => {
    const info = describeConnectionError(RAW_NOT_FOUND)
    expect(info.key).toBe('connection.errorPortNotFound')
    expect(info.params.port).toBe('COM3')
  })

  it('reconnaît un port introuvable sous Linux (ENOENT)', () => {
    const info = describeConnectionError(
      "Error: Error: ENOENT: no such file or directory, cannot open /dev/ttyUSB0"
    )
    expect(info.key).toBe('connection.errorPortNotFound')
  })

  it('reconnaît un port occupé (accès refusé)', () => {
    const info = describeConnectionError(
      "Error invoking remote method 'connection:connect': Error: Opening COM4: Access denied"
    )
    expect(info.key).toBe('connection.errorPortBusy')
    expect(info.params.port).toBe('COM4')
  })

  it('reconnaît un port occupé (resource busy)', () => {
    expect(describeConnectionError('Error: Opening /dev/ttyACM0: Resource busy').key).toBe(
      'connection.errorPortBusy'
    )
    expect(describeConnectionError('Error: Opening /dev/ttyACM0: Resource busy').params.port).toBe(
      '/dev/ttyACM0'
    )
  })

  it('renvoie une erreur générique avec le message nettoyé pour le reste', () => {
    const info = describeConnectionError("Error invoking remote method 'x': Error: Délai dépassé")
    expect(info.key).toBe('connection.errorGeneric')
    expect(info.params.message).toBe('Délai dépassé')
  })

  it('met « ? » quand le port est absent du message', () => {
    expect(describeConnectionError('Délai dépassé').params.port).toBe('?')
  })

  it('ne se trompe pas de casse', () => {
    expect(describeConnectionError('opening COM1: FILE NOT FOUND').key).toBe(
      'connection.errorPortNotFound'
    )
  })
})
