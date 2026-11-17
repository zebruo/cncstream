import { useTranslation } from 'react-i18next'
import { useConnectionStore } from '../../stores/connection.store'
import { useMachineStore } from '../../stores/machine.store'
import { Tooltip } from '../common/Tooltip'
import { catchCommandError } from '../../lib/command-errors'
import homeIcon from '../../assets/icons/home.svg'
import unlockIcon from '../../assets/icons/unlock.svg'
import styles from './MachineActions.module.css'

/**
 * Actions sur la machine entière, dans la barre du haut : Homing ($H) toujours à portée une fois
 * connecté, Déverrouiller ($X) seulement en alarme. Homing est grisé tant que la machine n'est
 * ni au repos ni en alarme (job, mouvement, homing en cours) : GRBL refuserait la commande.
 */
export function MachineActions() {
  const { t } = useTranslation()
  const isConnected = useConnectionStore((s) => s.state) === 'connected'
  const machineState = useMachineStore((s) => s.machineState)

  if (!isConnected) return null

  const canHome = machineState === 'Idle' || machineState === 'Alarm'

  return (
    <>
      <div className={styles.divider} />
      <Tooltip text={`${t('zeroGoto.homeTitle')} — ${t('zeroGoto.homeHint')}`}>
        <button
          className={styles.actionBtn}
          onClick={() => catchCommandError(window.cncstream.home())}
          disabled={!canHome}
          aria-label={t('zeroGoto.homeTitle')}
        >
          <img src={homeIcon} alt="" className={styles.icon} />
          <span className={styles.label}>{t('zeroGoto.home')}</span>
          <span className={styles.code}>$H</span>
        </button>
      </Tooltip>
      {machineState === 'Alarm' && (
        <Tooltip text={t('zeroGoto.unlockTitle')}>
          <button
            className={`${styles.actionBtn} ${styles.hot}`}
            onClick={() => catchCommandError(window.cncstream.unlock())}
            aria-label={t('zeroGoto.unlockTitle')}
          >
            <img src={unlockIcon} alt="" className={styles.icon} />
            <span className={styles.label}>{t('zeroGoto.unlock')}</span>
            <span className={styles.code}>$X</span>
          </button>
        </Tooltip>
      )}
    </>
  )
}
