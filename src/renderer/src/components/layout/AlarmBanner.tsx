import { useTranslation } from 'react-i18next'
import { useConnectionStore } from '../../stores/connection.store'
import { useMachineStore } from '../../stores/machine.store'
import { catchCommandError } from '../../lib/command-errors'
import styles from './AlarmBanner.module.css'

/**
 * Bandeau sous la barre du haut quand GRBL est en alarme : les deux gestes à faire, dans l'ordre
 * (déverrouiller, puis refaire un homing), au lieu de chercher deux icônes dans un panneau.
 */
export function AlarmBanner() {
  const { t } = useTranslation()
  const isConnected = useConnectionStore((s) => s.state) === 'connected'
  const alarmCode = useMachineStore((s) => s.alarmCode)
  const alarmMessage = useMachineStore((s) => s.alarmMessage)

  if (!isConnected || alarmCode === null) return null

  return (
    <div className={styles.banner} role="alert">
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={styles.icon}
      >
        <path d="M12 3l10 18H2z" />
        <path d="M12 10v5M12 18v.5" />
      </svg>
      <div className={styles.text}>
        <div className={styles.title}>
          {t('alarm.title', { code: alarmCode, message: alarmMessage ?? '' })}
        </div>
        <div className={styles.note}>{t('alarm.note')}</div>
      </div>
      <button className={styles.unlockBtn} onClick={() => catchCommandError(window.cncstream.unlock())}>
        {t('alarm.unlock')}
      </button>
      <button className={styles.homeBtn} onClick={() => catchCommandError(window.cncstream.home())}>
        {t('alarm.home')}
      </button>
    </div>
  )
}
