import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Panel } from '../common/Panel'
import { useConnectionStore } from '../../stores/connection.store'
import { DEFAULT_BAUD_RATES } from '@shared/constants/defaults'
import plugIcon from '../../assets/icons/plug.svg'
import unplugIcon from '../../assets/icons/unplug.svg'
import refreshIcon from '../../assets/icons/refresh.svg'
import styles from './ConnectionPanel.module.css'

export function ConnectionPanel() {
  const {
    state,
    ports,
    selectedPort,
    baudRate,
    error,
    setPorts,
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

  return (
    <Panel
      title={t('connection.title')}
      actions={<div className={styles.connectionDot} data-state={state} />}
    >
      <div className={styles.row}>
        <select
          className={styles.portSelect}
          value={selectedPort ?? ''}
          onChange={(e) => setSelectedPort(e.target.value || null)}
          disabled={isConnected || isConnecting}
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
          disabled={isConnected || isConnecting}
          title={t('connection.refreshTitle')}
        >
          <img src={refreshIcon} alt={t('connection.refreshTitle')} className={styles.refreshIconImg} />
        </button>
      </div>

      <div className={styles.row}>
        <select
          className={styles.baudSelect}
          value={baudRate}
          onChange={(e) => setBaudRate(Number(e.target.value))}
          disabled={isConnected || isConnecting}
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
          title={isConnecting ? t('connection.connecting') : isConnected ? t('connection.disconnect') : t('connection.connect')}
        >
          <img
            src={isConnected ? plugIcon : unplugIcon}
            alt={isConnected ? t('connection.disconnect') : t('connection.connect')}
            className={styles.connectIcon}
          />
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}
    </Panel>
  )
}
