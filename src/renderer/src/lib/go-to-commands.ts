/**
 * Commandes G-code des boutons « Aller à… » du panneau Zero / Go To.
 *
 * Le dégagement et la redescente en Z se font en relatif (`G91`) : la dernière commande
 * remet donc `G90` (absolu). Sans elle, la machine resterait en relatif, et un fichier
 * sans `G90` au début, ou une commande tapée dans la console, serait mal interprété.
 */

/** Monte de `safeHeight`, déplace en absolu (`move`), redescend de `safeHeight`, rétablit `G90`. */
function liftMoveLower(move: string, safeHeight: number): string[] {
  return [`G21 G91 G0 Z${safeHeight}`, move, `G21 G91 G0 Z-${safeHeight}`, 'G90']
}

/** « Aller à XY zéro » : dégagement, X0 Y0, redescente. */
export function goToXYZeroCommands(safeHeight: number): string[] {
  return liftMoveLower('G90 G0 X0 Y0', safeHeight)
}

/**
 * Aller à une position absolue. Sans Z demandé : même dégagement que ci-dessus.
 * Avec un Z : déplacement direct, sans dégagement ni passage en relatif.
 */
export function goToPositionCommands(
  position: { x?: number; y?: number; z?: number },
  safeHeight: number
): string[] {
  let move = 'G90 G0'
  if (position.x !== undefined) move += ` X${position.x}`
  if (position.y !== undefined) move += ` Y${position.y}`
  if (position.z !== undefined) move += ` Z${position.z}`
  return position.z === undefined ? liftMoveLower(move, safeHeight) : [move]
}
