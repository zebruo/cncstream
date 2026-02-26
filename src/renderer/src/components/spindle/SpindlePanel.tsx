import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Panel } from '../common/Panel'
import { useMachineStore } from '../../stores/machine.store'
import { useConnectionStore } from '../../stores/connection.store'
import { useUIStore, type SpindleMode } from '../../stores/ui.store'
import { useJobStore } from '../../stores/job.store'
import styles from './SpindlePanel.module.css'


export function SpindlePanel() {
  const { t } = useTranslation()
  const accessories = useMachineStore((s) => s.accessories)
  const spindleSpeed = useMachineStore((s) => s.spindleSpeed)
  const spindleMaxRpm = useMachineStore((s) => s.spindleMaxRpm)
  const overrides = useMachineStore((s) => s.overrides)
  const isConnected = useConnectionStore((s) => s.state) === 'connected'
  const jobState = useJobStore((s) => s.state)
  const jobActive = jobState === 'running' || jobState === 'paused'
  const spindleMode = useUIStore((s) => s.spindleMode)
  const setSpindleMode = useUIStore((s) => s.setSpindleMode)
  const [rpm, setRpm] = useState(0)
  const [direction, setDirection] = useState<'cw' | 'ccw'>('cw')
  const [localSpindleOn, setLocalSpindleOn] = useState(false)
  const [targetRpm, setTargetRpm] = useState(0)
  const userEditedRpm = useRef(false)
  const ignoreGrblUntil = useRef(0)

  // Initialize RPM from $30, but only if user hasn't manually edited it
  useEffect(() => {
    if (spindleMaxRpm > 0 && !userEditedRpm.current) {
      setRpm(spindleMaxRpm)
    }
  }, [spindleMaxRpm])

  const handleRpmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    userEditedRpm.current = true
    setRpm(parseInt(e.target.value) || 0)
  }

  const grblSpindleOn = accessories.spindleCW || accessories.spindleCCW

  // Sync from GRBL (G-code M3/M5), but ignore for 3s after user toggle
  useEffect(() => {
    if (Date.now() < ignoreGrblUntil.current) return
    if (grblSpindleOn && !localSpindleOn) {
      setLocalSpindleOn(true)
    } else if (!grblSpindleOn && localSpindleOn) {
      setLocalSpindleOn(false)
      setTargetRpm(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [grblSpindleOn])

  const isSpindleOn = localSpindleOn

  // Convert PWM value (0-1000) to real RPM using $30
  const displayRpm = (spindleMaxRpm > 1000 && spindleSpeed <= 1000)
    ? Math.round((spindleSpeed / 1000) * spindleMaxRpm)
    : spindleSpeed

  // Show effective RPM (base RPM × override %)
  const baseRpm = targetRpm > 0 ? targetRpm : displayRpm
  const alertRpm = Math.round(baseRpm * overrides.spindle / 100)

  const toggleSpindle = () => {
    ignoreGrblUntil.current = Date.now() + 3000
    if (isSpindleOn) {
      setLocalSpindleOn(false)
      setTargetRpm(0)
      window.cncstream.setSpindle({ enabled: false, direction: 'cw', rpm: 0 })
    } else {
      setLocalSpindleOn(true)
      setTargetRpm(rpm)
      userEditedRpm.current = false
      window.cncstream.setSpindle({ enabled: true, direction, rpm })
    }
  }

  const modeTooltips: Record<SpindleMode, string> = {
    pwm: t('spindle.tooltipPwm'),
    relay: t('spindle.tooltipRelay'),
    manual: t('spindle.tooltipManual')
  }

  const modeLabels: Record<SpindleMode, string> = {
    pwm: t('spindle.modePwm'),
    relay: t('spindle.modeRelay'),
    manual: t('spindle.modeManual')
  }

  const alertLabel = spindleMode === 'pwm'
    ? t('spindle.activePwm', { rpm: alertRpm })
    : spindleMode === 'relay'
      ? t('spindle.activeRelay')
      : t('spindle.activeManual')

  return (
    <Panel
      title={t('spindle.title')}
      actions={
        isSpindleOn ? (
          <span className={styles.activeAlert} title={modeTooltips[spindleMode]}>
            {alertLabel}
            {spindleMode === 'pwm' && overrides.spindle !== 100 && ` (${overrides.spindle}%)`}
          </span>
        ) : null
      }
    >
      <div className={styles.controls}>
        <div className={styles.startRow}>
          <button
            className={`${styles.dirBtn} ${direction === 'cw' ? styles.active : ''}`}
            onClick={() => setDirection('cw')}
            title={t('spindle.cwTitle')}
            disabled={isSpindleOn || jobActive}
          >
            ↻
          </button>
          <button
            className={`${styles.dirBtn} ${direction === 'ccw' ? styles.active : ''}`}
            onClick={() => setDirection('ccw')}
            title={t('spindle.ccwTitle')}
            disabled={isSpindleOn || jobActive}
          >
            ↺
          </button>
          {spindleMode === 'pwm' && (
            <input
              type="number"
              className={styles.rpmInput}
              value={rpm}
              onChange={handleRpmChange}
              min={0}
              max={spindleMaxRpm || 30000}
              step={100}
              title="RPM"
              disabled={jobActive}
            />
          )}
          <button
            className={`${styles.toggleBtn} ${isSpindleOn ? styles.on : ''}`}
            onClick={toggleSpindle}
            disabled={!isConnected || jobActive}
          >
            {isSpindleOn ? t('spindle.stop') : t('spindle.start')}
          </button>
        </div>

        <div className={styles.modeRow}>
          <span className={styles.modeLabel}>{t('spindle.modeLabel')}</span>
          <select
            className={styles.modeSelect}
            value={spindleMode}
            onChange={(e) => setSpindleMode(e.target.value as SpindleMode)}
          >
            {(Object.keys(modeLabels) as SpindleMode[]).map((mode) => (
              <option key={mode} value={mode}>{modeLabels[mode]}</option>
            ))}
          </select>
          <span className={styles.infoIcon} title={modeTooltips[spindleMode]}>
            i
          </span>
        </div>
      </div>
    </Panel>
  )
}
