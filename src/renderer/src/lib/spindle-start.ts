/**
 * Vitesse de broche à utiliser quand on démarre la broche depuis l'avertissement du job :
 * celle que demande le fichier (sa valeur S la plus haute), plafonnée à la vitesse maximale
 * de la machine ($30) quand elle est connue (> 0). Arrondie au tour/minute.
 */
export function spindleStartRpm(fileMaxRpm: number, machineMaxRpm: number): number {
  if (!Number.isFinite(fileMaxRpm) || fileMaxRpm <= 0) return 0
  const limited = machineMaxRpm > 0 ? Math.min(fileMaxRpm, machineMaxRpm) : fileMaxRpm
  return Math.round(limited)
}
