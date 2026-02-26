import { useTranslation } from 'react-i18next'
import { useConnectionStore } from '../../stores/connection.store'
import { useMachineStore } from '../../stores/machine.store'
import { useJobStore } from '../../stores/job.store'
import { useUIStore } from '../../stores/ui.store'
import styles from './StatusBar.module.css'

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

const SPINDLE_MODE_SHORT: Record<string, string> = {
  pwm: 'PWM',
  relay: 'RLY',
  manual: 'MAN'
}


export function StatusBar() {
  const { t } = useTranslation()
  const connectionState = useConnectionStore((s) => s.state)
  const selectedPort = useConnectionStore((s) => s.selectedPort)
  const baudRate = useConnectionStore((s) => s.baudRate)
  const feedRate = useMachineStore((s) => s.feedRate)
  const spindleSpeed = useMachineStore((s) => s.spindleSpeed)
  const spindleMaxRpm = useMachineStore((s) => s.spindleMaxRpm)
  const overrides = useMachineStore((s) => s.overrides)
  const buffer = useMachineStore((s) => s.buffer)
  const spindleMode = useUIStore((s) => s.spindleMode)

  // Convert PWM value (0-1000) to real RPM using $30, then apply override %
  const baseRpm = (spindleMaxRpm > 1000 && spindleSpeed <= 1000)
    ? Math.round((spindleSpeed / 1000) * spindleMaxRpm)
    : spindleSpeed
  const displayRpm = Math.round(baseRpm * overrides.spindle / 100)
  const jobState = useJobStore((s) => s.state)
  const percentComplete = useJobStore((s) => s.percentComplete)
  const elapsedMs = useJobStore((s) => s.elapsedMs)

  const spindleLabel = spindleMode === 'pwm'
    ? `${displayRpm}`
    : spindleMode === 'relay'
      ? displayRpm > 0 ? 'ON' : 'OFF'
      : '---'

  const spindleTooltip = spindleMode === 'pwm'
    ? t('spindle.statusTipPwm', { rpm: displayRpm })
    : spindleMode === 'relay'
      ? t(displayRpm > 0 ? 'spindle.statusTipRelayOn' : 'spindle.statusTipRelayOff')
      : t('spindle.statusTipManual', { rpm: displayRpm })

  const spindleModeTips: Record<string, string> = {
    pwm: t('spindle.modeBadgePwm'),
    relay: t('spindle.modeBadgeRelay'),
    manual: t('spindle.modeBadgeManual')
  }

  return (
    <footer className={styles.statusBar}>
      <div className={styles.section}>
        <span className={styles.label}>
          {connectionState === 'connected'
            ? `${selectedPort} @ ${baudRate}`
            : t('statusBar.disconnected')}
        </span>
      </div>

      {connectionState === 'connected' && (
        <>
          <div className={styles.separator} />
          <div className={styles.section}>
            <span className={styles.label}>F:</span>
            <span className={styles.value}>{feedRate}</span>
            <span className={styles.unit}>mm/min</span>
          </div>
          <div className={styles.separator} />
          <div className={styles.section} title={spindleTooltip}>
            <span className={styles.label}>S:</span>
            <span className={styles.value}>{spindleLabel}</span>
            {spindleMode === 'pwm' && <span className={styles.unit}>RPM</span>}
            <span
              className={styles.modeBadge}
              title={spindleModeTips[spindleMode]}
            >
              {SPINDLE_MODE_SHORT[spindleMode]}
            </span>
          </div>
          <div className={styles.separator} />
          <div className={styles.section}>
            <span className={styles.label}>Buf:</span>
            <span className={styles.value}>{buffer.planner}/{buffer.rx}</span>
          </div>
        </>
      )}

      <div className={styles.spacer} />

      {jobState !== 'idle' && (
        <div className={styles.section}>
          <span className={styles.label}>{jobState.toUpperCase()}</span>
          <span className={styles.value}>{percentComplete.toFixed(1)}%</span>
          <span className={styles.unit}>{formatTime(elapsedMs)}</span>
        </div>
      )}
    </footer>
  )
}
