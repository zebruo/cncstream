import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useConnectionStore } from '../../stores/connection.store'
import { DEFAULT_BAUD_RATES } from '@shared/constants/defaults'
import refreshIcon from '../../assets/icons/refresh.svg'
import styles from './ConnectionBar.module.css'

/**
 * Connexion à la machine, dans la barre du haut : voyant, port, rafraîchir,
 * vitesse et bouton Connecter / Déconnecter. Le message d'erreur éventuel
 * s'affiche dans ConnectionErrorBanner, sous la barre.
 */
export function ConnectionBar() {
  const {
    state,
    ports,
    selectedPort,
    baudRate,
    setSelectedPort,
    setBaudRate,
    refreshPorts,
    connect,
    disconnect
  } = useConnectionStore()

  useEffect(() => {
    refreshPorts()
    const interval = setInterval(refreshPorts, 3000)
    return () => clearInterval(interval)
  }, [refreshPorts])

  const { t } = useTranslation()
  const isConnected = state === 'connected'
  const isConnecting = state === 'connecting'
  const locked = isConnected || isConnecting

  const buttonLabel = isConnecting
    ? t('connection.connecting')
    : isConnected
      ? t('connection.disconnect')
      : t('connection.connect')

  return (
    <div className={styles.bar}>
      <span
        className={styles.connectionDot}
        data-state={state}
        role="img"
        aria-label={t(`connection.state.${state}`)}
        title={t(`connection.state.${state}`)}
      />

      <select
        className={styles.portSelect}
        aria-label={t('connection.portLabel')}
        value={selectedPort ?? ''}
        onChange={(e) => setSelectedPort(e.target.value || null)}
        disabled={locked}
      >
        <option value="">{t('connection.selectPort')}</option>
        {ports.map((port) => (
          <option key={port.path} value={port.path}>
            {port.path} {port.manufacturer ? `(${port.manufacturer})` : ''}
          </option>
        ))}
      </select>

      <button
        className={styles.refreshBtn}
        onClick={refreshPorts}
        disabled={locked}
        title={t('connection.refreshTitle')}
        aria-label={t('connection.refreshTitle')}
      >
        <img src={refreshIcon} alt="" className={styles.refreshIconImg} />
      </button>

      <select
        className={styles.baudSelect}
        aria-label={t('connection.baudLabel')}
        value={baudRate}
        onChange={(e) => setBaudRate(Number(e.target.value))}
        disabled={locked}
      >
        {DEFAULT_BAUD_RATES.map((rate) => (
          <option key={rate} value={rate}>
            {rate} baud
          </option>
        ))}
      </select>

      <button
        className={`${styles.connectBtn} ${isConnected ? styles.disconnect : ''}`}
        onClick={isConnected ? disconnect : connect}
        disabled={(!selectedPort && !isConnected) || isConnecting}
        title={buttonLabel}
        aria-label={buttonLabel}
      >
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
        >
          <path d="M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0z" />
          <path d="M12 18v4" />
          {isConnected && <path d="M3 3l18 18" />}
        </svg>
        {/* Connecté : icône seule (le nom reste en infobulle et pour les lecteurs d'écran) */}
        {!isConnected && buttonLabel}
      </button>
    </div>
  )
}
