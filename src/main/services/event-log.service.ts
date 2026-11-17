import { appendFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs'
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

  constructor(
    private readonly dir: string,
    private readonly now: () => Date = () => new Date()
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

  /** Écrit une ligne `HH:MM:SS.mmm [catégorie] message`. */
  log(category: string, message: string): void {
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
