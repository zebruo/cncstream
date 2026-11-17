import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import {
  EventLogService,
  formatPositions,
  LOG_MAX_FILE_BYTES,
  LOG_RETENTION_DAYS
} from './event-log.service'

// 15 novembre 2026, 14:03:09.007 (heure locale)
const NOON = new Date(2026, 10, 15, 14, 3, 9, 7)

let dir: string

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'cncstream-log-'))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

function read(name: string): string {
  return readFileSync(join(dir, name), 'utf-8')
}

describe('EventLogService', () => {
  describe('écriture', () => {
    it('écrit « heure [catégorie] message » dans le fichier du jour', () => {
      const log = new EventLogService(dir, () => NOON)
      log.log('machine', '> G0 X10')
      expect(read('cncstream-2026-11-15.log')).toBe('14:03:09.007 [machine] > G0 X10\n')
    })

    it('ajoute les lignes à la suite, dans l\'ordre', () => {
      const log = new EventLogService(dir, () => NOON)
      log.log('a', 'un')
      log.log('b', 'deux')
      log.log('c', 'trois')
      const lines = read('cncstream-2026-11-15.log').trimEnd().split('\n')
      expect(lines.map((l) => l.slice(l.indexOf('['))))
        .toEqual(['[a] un', '[b] deux', '[c] trois'])
    })

    it('conserve ce qui était déjà dans le fichier (redémarrage de l\'appli)', () => {
      new EventLogService(dir, () => NOON).log('app', 'premier lancement')
      new EventLogService(dir, () => NOON).log('app', 'second lancement')
      const content = read('cncstream-2026-11-15.log')
      expect(content).toContain('premier lancement')
      expect(content).toContain('second lancement')
    })

    it('change de fichier à minuit', () => {
      let now = new Date(2026, 10, 15, 23, 59, 59, 999)
      const log = new EventLogService(dir, () => now)
      log.log('a', 'avant minuit')
      now = new Date(2026, 10, 16, 0, 0, 0, 1)
      log.log('a', 'après minuit')
      expect(read('cncstream-2026-11-15.log')).toContain('avant minuit')
      expect(read('cncstream-2026-11-16.log')).toContain('après minuit')
      expect(read('cncstream-2026-11-16.log')).not.toContain('avant minuit')
    })

    it('crée le dossier s\'il n\'existe pas', () => {
      const nested = join(dir, 'a', 'b')
      const log = new EventLogService(nested, () => NOON)
      log.log('x', 'ok')
      expect(readdirSync(nested)).toEqual(['cncstream-2026-11-15.log'])
    })

    it('ne lève rien si le dossier est inutilisable', () => {
      // Un fichier à la place du dossier : mkdir et append échouent
      const blocker = join(dir, 'fichier')
      writeFileSync(blocker, 'x')
      const log = new EventLogService(join(blocker, 'logs'), () => NOON)
      expect(() => log.log('x', 'ignoré')).not.toThrow()
    })
  })

  describe('taille maximale', () => {
    it('s\'arrête au-delà de la limite, avec un seul message de fin', () => {
      writeFileSync(join(dir, 'cncstream-2026-11-15.log'), 'x'.repeat(LOG_MAX_FILE_BYTES - 10))
      const log = new EventLogService(dir, () => NOON)
      log.log('a', 'cette ligne dépasse la limite')
      log.log('a', 'et celle-ci aussi')
      const content = read('cncstream-2026-11-15.log')
      expect(content).not.toContain('dépasse la limite')
      expect(content).not.toContain('et celle-ci')
      expect(content.match(/Taille maximale atteinte/g)).toHaveLength(1)
    })

    it('accepte une ligne qui tient juste dans la limite', () => {
      const line = '14:03:09.007 [a] ok\n'
      writeFileSync(join(dir, 'cncstream-2026-11-15.log'), 'x'.repeat(LOG_MAX_FILE_BYTES - line.length))
      const log = new EventLogService(dir, () => NOON)
      log.log('a', 'ok')
      expect(read('cncstream-2026-11-15.log').endsWith(line)).toBe(true)
    })

    it('reprend le lendemain', () => {
      writeFileSync(join(dir, 'cncstream-2026-11-15.log'), 'x'.repeat(LOG_MAX_FILE_BYTES))
      let now = NOON
      const log = new EventLogService(dir, () => now)
      log.log('a', 'plein')
      now = new Date(2026, 10, 16, 8, 0, 0, 0)
      log.log('a', 'nouveau jour')
      expect(read('cncstream-2026-11-16.log')).toContain('nouveau jour')
    })
  })

  describe('nettoyage', () => {
    const names = (): string[] => readdirSync(dir).sort()

    it(`garde ${LOG_RETENTION_DAYS} jours (aujourd'hui compris) et supprime le reste`, () => {
      // Aujourd'hui = 15 : on garde du 9 au 15, on supprime le 8 et avant
      for (const d of ['07', '08', '09', '10', '15']) {
        writeFileSync(join(dir, `cncstream-2026-11-${d}.log`), 'x')
      }
      new EventLogService(dir, () => NOON)
      expect(names()).toEqual([
        'cncstream-2026-11-09.log',
        'cncstream-2026-11-10.log',
        'cncstream-2026-11-15.log'
      ])
    })

    it('traverse un changement de mois', () => {
      // Aujourd'hui = 3 décembre : on garde du 27 novembre au 3 décembre
      for (const f of ['2026-11-26', '2026-11-27', '2026-12-01']) {
        writeFileSync(join(dir, `cncstream-${f}.log`), 'x')
      }
      new EventLogService(dir, () => new Date(2026, 11, 3, 10, 0, 0, 0))
      expect(names()).toEqual(['cncstream-2026-11-27.log', 'cncstream-2026-12-01.log'])
    })

    it('ne touche pas aux fichiers qui ne sont pas des journaux', () => {
      writeFileSync(join(dir, 'notes.txt'), 'x')
      writeFileSync(join(dir, 'cncstream-2020-01-01.log.bak'), 'x')
      writeFileSync(join(dir, 'cncstream-2020-01-01.log'), 'x')
      new EventLogService(dir, () => NOON)
      expect(names()).toEqual(['cncstream-2020-01-01.log.bak', 'notes.txt'])
    })
  })

  describe('clear', () => {
    it("vide le journal du jour et n'y laisse qu'une ligne de repère", () => {
      const log = new EventLogService(dir, () => NOON)
      log.log('machine', '> G0 X10')
      log.log('machine', '< ok')
      log.clear()
      expect(read('cncstream-2026-11-15.log')).toBe('14:03:09.007 [journal] Journal effacé depuis la console\n')
    })

    it('laisse les journaux des autres jours', () => {
      writeFileSync(join(dir, 'cncstream-2026-11-14.log'), 'hier\n')
      const log = new EventLogService(dir, () => NOON)
      log.log('a', 'x')
      log.clear()
      expect(read('cncstream-2026-11-14.log')).toBe('hier\n')
    })

    it("réautorise l'écriture après une limite de taille atteinte", () => {
      writeFileSync(join(dir, 'cncstream-2026-11-15.log'), 'x'.repeat(LOG_MAX_FILE_BYTES))
      const log = new EventLogService(dir, () => NOON)
      log.log('a', 'refusée')
      log.clear()
      log.log('a', 'acceptée')
      expect(read('cncstream-2026-11-15.log')).toContain('acceptée')
    })

    it("crée le fichier s'il n'existe pas encore", () => {
      const log = new EventLogService(dir, () => NOON)
      log.clear()
      expect(readdirSync(dir)).toEqual(['cncstream-2026-11-15.log'])
    })

    it('ne lève rien si le dossier est inutilisable', () => {
      const blocker = join(dir, 'fichier')
      writeFileSync(blocker, 'x')
      const log = new EventLogService(join(blocker, 'logs'), () => NOON)
      expect(() => log.clear()).not.toThrow()
    })
  })

  describe('formatPositions', () => {
    it('affiche machine puis pièce, avec 3 décimales', () => {
      expect(
        formatPositions({
          mpos: { x: 115, y: 155.5, z: -1 },
          wpos: { x: 0, y: 0.25, z: 0 }
        })
      ).toBe('MPos 115.000 155.500 -1.000 | WPos 0.000 0.250 0.000')
    })

    it('arrondit à 3 décimales', () => {
      expect(
        formatPositions({ mpos: { x: 1.23456, y: 0, z: 0 }, wpos: { x: 0, y: 0, z: -0.0004 } })
      ).toBe('MPos 1.235 0.000 0.000 | WPos 0.000 0.000 -0.000')
    })
  })

  it('expose son dossier', () => {
    expect(new EventLogService(dir, () => NOON).directory).toBe(dir)
  })
})
