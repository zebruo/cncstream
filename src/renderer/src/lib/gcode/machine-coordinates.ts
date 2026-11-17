import { stripGcodeComments } from '@shared/utils/gcode-comments'

/**
 * Indique si un programme G-code utilise les coordonnées machine (`G53`).
 *
 * `G53` déplace la machine par rapport à son point de référence physique (le home) :
 * le résultat n'a de sens que si un homing (`$H`) a été fait. Les commentaires
 * (`; …` et `( … )`) sont ignorés : « (retour G53) » ne compte pas.
 * Chaque mot « G… » est lu en entier puis comparé à 53 : G153, G530 et G53.1 ne comptent
 * pas, G053 et G0G53 oui.
 */
export function usesMachineCoordinates(gcode: string): boolean {
  for (const line of gcode.split('\n')) {
    for (const word of stripGcodeComments(line).matchAll(/G\s*(\d+(?:\.\d+)?)/gi)) {
      if (Number(word[1]) === 53) return true
    }
  }
  return false
}
