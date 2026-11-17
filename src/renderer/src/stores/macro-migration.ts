/**
 * Version du format des macros enregistrées (clé `cncstream-macros` du localStorage).
 *
 * À AUGMENTER à chaque modification d'une macro intégrée (BUILT_IN_MACROS dans
 * macro.store.ts) : ajout de contenu, renommage, suppression. Sans cela, la copie
 * enregistrée sur la machine de l'utilisateur prime et l'ancienne version reste affichée.
 *
 * Historique :
 *  - 0 : avant l'existence d'un numéro de version
 *  - 1 : carré 200×200 et rainures (L, diagonale) ; « Retour origine XY » supprimée
 *  - 2 : avance XY 800 → 750 (vitesse maximale de la machine, $110/$111)
 *  - 3 : « Rainure diagonale 200×200 » remplacée par « Test largeur diagonale » ;
 *        ajout de « Test largeur X et Y »
 */
export const MACROS_VERSION = 3

/**
 * Migre les macros enregistrées vers la version courante : les macros intégrées
 * sont retirées (le store remet alors celles du code, à jour), les macros de
 * l'utilisateur sont conservées telles quelles.
 */
export function migrateMacros<T extends object>(
  persisted: { macros?: T[] } | undefined
): { macros: T[] } {
  return { macros: (persisted?.macros ?? []).filter((m) => !(m as { builtIn?: boolean }).builtIn) }
}
