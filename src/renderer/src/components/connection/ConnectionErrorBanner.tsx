import { useTranslation } from 'react-i18next'
import { useConnectionStore } from '../../stores/connection.store'
import { describeConnectionError } from '../../lib/connection-errors'
import styles from './ConnectionErrorBanner.module.css'

/** Bandeau sous la barre du haut : erreur de connexion, fermable. */
export function ConnectionErrorBanner() {
  const { t } = useTranslation()
  const error = useConnectionStore((s) => s.error)
  const clearError = useConnectionStore((s) => s.clearError)

  if (!error) return null

  const info = describeConnectionError(error)

  return (
    <div className={styles.banner} role="alert">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={styles.icon}
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M12 7v6M12 16.5v.5" />
      </svg>
      <span className={styles.message}>{t(info.key, info.params)}</span>
      <button className={styles.closeBtn} onClick={clearError} aria-label={t('connection.dismissError')}>
        ×
      </button>
    </div>
  )
}
