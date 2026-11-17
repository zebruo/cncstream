import type { FileInsight } from '@shared/types/gcode'

/**
 * Diamètre de fraise annoncé par le fichier G-code (en-tête VCarve, Fusion 360, Box Generator…),
 * en mm : celui du premier outil dont le diamètre est connu. Null si le fichier n'en donne aucun.
 *
 * Un fichier à plusieurs outils n'en affiche qu'un : la vue 3D ne suit pas les changements d'outil.
 */
export function fileToolDiameter(insight: Pick<FileInsight, 'toolInfo'>): number | null {
  for (const tool of insight.toolInfo) {
    if (tool.diameter !== undefined && Number.isFinite(tool.diameter) && tool.diameter > 0) {
      return tool.diameter
    }
  }
  return null
}
