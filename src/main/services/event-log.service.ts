import { appendFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'fs'
import { join } from 'path'

/** Nombre de jours de journaux conservés (le plus ancien est supprimé au démarrage). */
export const LOG_RETENTION_DAYS = 7

/** Taille maximale d'un fichier journal : au-delà, plus rien n'est écrit ce jour-là. */
export const LOG_MAX_FILE_BYTES = 5 * 1024 * 1024

const FILE_PATTERN = /^cncstream-(\d{4}-\d{2}-\d{2})\.log$/

function pad(n: number, size = 2): string {
  return String(n).padStart(size, '0')
}

/** Date locale au format AAAA-MM-JJ (le jour de la machine, pas UTC). */
function dayStamp(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Heure locale au format HH:MM:SS.mmm. */
function timeStamp(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`
}

/**
 * Journal des événements machine, écrit dans un fichier texte par jour
 * (`cncstream-AAAA-MM-JJ.log`) pour pouvoir relire ce qui s'est passé après coup.
 *
 * Écriture synchrone : une ligne est sur le disque même si l'appli plante juste après.
 * Une erreur d'écriture (disque plein, dossier verrouillé) ne doit jamais gêner la machine :
 * elle est ignorée.
 */
export class EventLogService {
  private truncatedDay: string | null = null

  /**
   * @param enabled journal actif ou non : l'appli le lit dans ses réglages (désactivé par défaut) ;
   *   actif par défaut ici, pour le service seul
   */
  constructor(
    private readonly dir: string,
    private readonly now: () => Date = () => new Date(),
    private enabled = true
  ) {
    try {
      mkdirSync(this.dir, { recursive: true })
    } catch {
      // Journal indisponible : on continue sans
    }
    this.pruneOldFiles()
  }

  get directory(): string {
    return this.dir
  }

  get isEnabled(): boolean {
    return this.enabled
  }

  /** Active ou coupe le journal ; le changement est lui-même noté (côté actif). */
  setEnabled(enabled: boolean): void {
    if (enabled === this.enabled) return
    if (enabled) {
      this.enabled = true
      this.log('journal', 'Journal activé')
    } else {
      this.log('journal', 'Journal désactivé')
      this.enabled = false
    }
  }

  /** Écrit une ligne `HH:MM:SS.mmm [catégorie] message`. */
  log(category: string, message: string): void {
    if (!this.enabled) return
    const date = this.now()
    const day = dayStamp(date)
    const file = join(this.dir, `cncstream-${day}.log`)
    const line = `${timeStamp(date)} [${category}] ${message}\n`

    try {
      if (this.truncatedDay === day) return
      if (existsSync(file) && statSync(file).size + line.length > LOG_MAX_FILE_BYTES) {
        this.truncatedDay = day
        appendFileSync(file, `${timeStamp(date)} [log] Taille maximale atteinte, le journal du jour s'arrête ici\n`)
        return
      }
      appendFileSync(file, line)
    } catch {
      // Voir le commentaire de la classe
    }
  }

  /**
   * Vide le journal du jour (bouton « Effacer » de la console) pour repartir d'un
   * fichier lisible avant un essai. Les journaux des jours précédents sont conservés.
   */
  clear(): void {
    const date = this.now()
    try {
      writeFileSync(join(this.dir, `cncstream-${dayStamp(date)}.log`), '')
      this.truncatedDay = null
    } catch {
      // Voir le commentaire de la classe
    }
    this.log('journal', 'Journal effacé depuis la console')
  }

  /** Supprime les journaux plus anciens que LOG_RETENTION_DAYS jours. */
  private pruneOldFiles(): void {
    try {
      const limit = new Date(this.now())
      limit.setHours(0, 0, 0, 0)
      limit.setDate(limit.getDate() - LOG_RETENTION_DAYS + 1)
      const oldestKept = dayStamp(limit)

      for (const name of readdirSync(this.dir)) {
        const match = FILE_PATTERN.exec(name)
        // Les dates AAAA-MM-JJ se comparent correctement comme du texte
        if (match && match[1] < oldestKept) {
          unlinkSync(join(this.dir, name))
        }
      }
    } catch {
      // Nettoyage impossible : sans conséquence
    }
  }
}

interface Xyz {
  x: number
  y: number
  z: number
}

/**
 * Positions sur une ligne : `MPos 115.000 155.000 -1.000 | WPos 0.000 0.000 0.000`.
 * MPos = repère machine (celui du homing et de G53), WPos = repère pièce (G54).
 * Comparer les deux au fil du journal révèle un repère faussé.
 */
export function formatPositions(status: { mpos: Xyz; wpos: Xyz }): string {
  const fmt = (p: Xyz): string => `${p.x.toFixed(3)} ${p.y.toFixed(3)} ${p.z.toFixed(3)}`
  return `MPos ${fmt(status.mpos)} | WPos ${fmt(status.wpos)}`
}
