import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Panel } from '../common/Panel'
import { useMachineStore } from '../../stores/machine.store'
import { useConnectionStore } from '../../stores/connection.store'
import styles from './CoolantPanel.module.css'
import { catchCommandError } from '../../lib/command-errors'

export function CoolantPanel() {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const accessories = useMachineStore((s) => s.accessories)
  const isConnected = useConnectionStore((s) => s.state) === 'connected'

  const isAnyActive = accessories.flood || accessories.mist

  const toggleFlood = () => {
    if (!isConnected) return
    if (accessories.flood) {
      catchCommandError(window.cncstream.sendCommand('M9'))
    } else {
      catchCommandError(window.cncstream.sendCommand('M8'))
    }
  }

  const toggleMist = () => {
    if (!isConnected) return
    if (accessories.mist) {
      catchCommandError(window.cncstream.sendCommand('M9'))
    } else {
      catchCommandError(window.cncstream.sendCommand('M7'))
    }
  }

  const stopAll = () => {
    if (!isConnected) return
    catchCommandError(window.cncstream.sendCommand('M9'))
  }

  return (
    <Panel
      title={t('coolant.title')}
      onToggle={() => setExpanded((v) => !v)}
      expanded={expanded}
      actions={isAnyActive ? (
        <span className={styles.activeAlert}>
          {accessories.flood && 'FLOOD '}
          {accessories.mist && 'MIST'}
        </span>
      ) : undefined}
    >
      {expanded && (
        <div className={styles.controls}>
          <button
            className={`${styles.coolantBtn} ${accessories.flood ? styles.active : ''}`}
            onClick={toggleFlood}
            disabled={!isConnected}
            title={t('coolant.floodTitle')}
          >
            {t('coolant.flood')}
          </button>
          <button
            className={`${styles.coolantBtn} ${accessories.mist ? styles.active : ''}`}
            onClick={toggleMist}
            disabled={!isConnected}
            title={t('coolant.mistTitle')}
          >
            {t('coolant.mist')}
          </button>
          <button
            className={styles.stopBtn}
            onClick={stopAll}
            disabled={!isConnected || !isAnyActive}
            title={t('coolant.stopTitle')}
          >
            {t('coolant.stop')}
          </button>
        </div>
      )}
    </Panel>
  )
}
