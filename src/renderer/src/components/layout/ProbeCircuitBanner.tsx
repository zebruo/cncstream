import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useConnectionStore } from '../../stores/connection.store'
import { useMachineStore } from '../../stores/machine.store'
import { useUIStore } from '../../stores/ui.store'
import styles from './ProbeCircuitBanner.module.css'

/**
 * Bandeau vert sous la barre du haut : le test du circuit sonde / fraise a réussi.
 * Il reste jusqu'à ce que le palpage soit appliqué (Z0 défini), qu'on le ferme, ou que
 * la connexion soit coupée (le test est alors à refaire).
 */
export function ProbeCircuitBanner() {
  const { t } = useTranslation()
  const isConnected = useConnectionStore((s) => s.state) === 'connected'
  const circuitTested = useMachineStore((s) => s.probeCircuitTested)
  const inContact = useMachineStore((s) => s.pins).includes('P')
  const zProbeApplied = useUIStore((s) => s.zProbeApplied)
  const [dismissed, setDismissed] = useState(false)

  // Fermé pour ce test seulement : un nouveau test (après déconnexion) le ré-affiche.
  // État ajusté pendant le rendu (pas d'effet).
  if (!circuitTested && dismissed) {
    setDismissed(false)
  }

  if (!isConnected || !circuitTested || zProbeApplied || dismissed) return null

  return (
    <div className={styles.banner} role="status">
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={styles.icon}
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M8 12.5l3 3 5-6" />
      </svg>
      <span className={styles.message}>
        {inContact ? t('zeroGoto.probeCircuitContact') : t('zeroGoto.probeCircuitOk')}
      </span>
      <button
        className={styles.closeBtn}
        onClick={() => setDismissed(true)}
        aria-label={t('connection.dismissError')}
      >
        ×
      </button>
    </div>
  )
}
