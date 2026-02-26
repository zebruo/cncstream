import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Panel } from '../common/Panel'
import { useUIStore } from '../../stores/ui.store'
import { useConnectionStore } from '../../stores/connection.store'
import { useMachineStore } from '../../stores/machine.store'
import homeIcon from '../../assets/icons/home.svg'
import unlockIcon from '../../assets/icons/unlock.svg'
import styles from './ZeroGoToPanel.module.css'

const MM_PER_INCH = 25.4

type ProbePhase = 'idle' | 'running' | 'confirm' | 'failed'

export function ZeroGoToPanel() {
  const safeHeight = useUIStore((s) => s.safeHeight)
  const setSafeHeight = useUIStore((s) => s.setSafeHeight)
  const probeThickness = useUIStore((s) => s.probeThickness)
  const setProbeThickness = useUIStore((s) => s.setProbeThickness)
  const units = useUIStore((s) => s.units)
  const setZProbeApplied = useUIStore((s) => s.setZProbeApplied)
  const isConnected = useConnectionStore((s) => s.state) === 'connected'
  const pins = useMachineStore((s) => s.pins)
  const probePin = isConnected && pins.includes('P')
  const { t } = useTranslation()

  const [probePhase, setProbePhase] = useState<ProbePhase>('idle')
  const [circuitTested, setCircuitTested] = useState(false)

  useEffect(() => {
    if (probePin) setCircuitTested(true)
  }, [probePin])

  useEffect(() => {
    if (!isConnected) {
      setCircuitTested(false)
      setZProbeApplied(false)
    }
  }, [isConnected])

  const isIn = units === 'in'

  const displaySafeHeight = isIn ? parseFloat((safeHeight / MM_PER_INCH).toFixed(4)) : safeHeight
  const handleSafeHeightChange = (val: number) => {
    if (isNaN(val) || val < 0) return
    setSafeHeight(isIn ? val * MM_PER_INCH : val)
  }

  const displayProbeThickness = isIn
    ? parseFloat((probeThickness / MM_PER_INCH).toFixed(4))
    : probeThickness
  const handleProbeThicknessChange = (val: number) => {
    const mm = isIn ? val * MM_PER_INCH : val
    if (isNaN(mm) || mm < 0.1 || mm > 50) return
    setProbeThickness(mm)
  }

  useEffect(() => {
    return window.cncstream.onProbeResult((result) => {
      setProbePhase(result.success ? 'confirm' : 'failed')
    })
  }, [])

  const goToXYZero = () => {
    if (!isConnected) return
    window.cncstream.sendCommand(`G21 G91 G0 Z${safeHeight}`)
    window.cncstream.sendCommand('G90 G0 X0 Y0')
    window.cncstream.sendCommand(`G21 G91 G0 Z-${safeHeight}`)
  }

  const goToPosition = (x?: number, y?: number, z?: number) => {
    if (!isConnected) return
    let cmd = 'G90 G0'
    if (x !== undefined) cmd += ` X${x}`
    if (y !== undefined) cmd += ` Y${y}`
    if (z !== undefined) cmd += ` Z${z}`
    if (z === undefined) {
      window.cncstream.sendCommand(`G21 G91 G0 Z${safeHeight}`)
      window.cncstream.sendCommand(cmd)
    } else {
      window.cncstream.sendCommand(cmd)
    }
  }

  const homeAll = () => { if (!isConnected) return; window.cncstream.home() }
  const unlockMachine = () => { if (!isConnected) return; window.cncstream.unlock() }

  const handleProbeZ = () => {
    if (!isConnected || probePhase !== 'idle') return
    setProbePhase('running')
    window.cncstream.probeZ({ feedRate: 50, maxDistance: 20, retractDistance: safeHeight }).catch(() => setProbePhase('failed'))
  }

  const handleApplyProbe = () => {
    window.cncstream.sendCommand(`G10 L20 P1 Z${probeThickness + safeHeight}`)
    setZProbeApplied(true)
    setProbePhase('idle')
  }

  const handleDismissProbe = () => setProbePhase('idle')

  return (
    <Panel title={t('zeroGoto.title')}>
      <div className={styles.row}>
        <button className={styles.actionBtn} onClick={goToXYZero} disabled={!isConnected}>
          {t('zeroGoto.goToXY')}
        </button>
        <button className={styles.actionBtn} onClick={() => goToPosition(undefined, undefined, 0)} disabled={!isConnected}>
          {t('zeroGoto.goToZ')}
        </button>
      </div>

      <div className={styles.row}>
        <button className={styles.machineBtn} onClick={homeAll} disabled={!isConnected} title={t('zeroGoto.homeTitle')}>
          <img src={homeIcon} alt="" className={styles.btnIcon} />
        </button>
        <button className={styles.machineBtn} onClick={unlockMachine} disabled={!isConnected} title={t('zeroGoto.unlockTitle')}>
          <img src={unlockIcon} alt="" className={styles.btnIcon} />
        </button>
      </div>

      <div className={styles.divider} />

      <div className={styles.fieldsRow}>
        <div className={styles.probeThicknessField} title={t('zeroGoto.probeThicknessTitle')}>
          <span className={styles.label}>{t('zeroGoto.probeThickness', { unit: isIn ? 'in' : 'mm' })}</span>
          <input
            type="number"
            className={styles.input}
            value={displayProbeThickness}
            onChange={(e) => handleProbeThicknessChange(parseFloat(e.target.value))}
            onWheel={(e) => e.currentTarget.blur()}
            min={isIn ? 0.004 : 0.1}
            max={isIn ? 2 : 50}
            step={isIn ? 0.001 : 0.1}
          />
        </div>
        <div className={styles.safeHeight} title={t('zeroGoto.safeHeightTitle')}>
          <label className={styles.label}>{t('zeroGoto.safeHeight', { unit: isIn ? 'in' : 'mm' })}</label>
          <input
            type="number"
            className={styles.input}
            value={displaySafeHeight}
            onChange={(e) => handleSafeHeightChange(parseFloat(e.target.value) || 0)}
            onWheel={(e) => e.currentTarget.blur()}
            min={0}
            step={isIn ? 0.001 : 0.5}
          />
        </div>
      </div>

      {probePhase === 'idle' && (
        <div className={`${styles.probePinRow} ${probePin ? styles.probePinContact : styles.probePinOpen}`}>
          <span className={styles.probePinDot} />
          <span className={styles.probePinText}>
            {probePin ? t('zeroGoto.probeCircuitContact') : t('zeroGoto.probeCircuitOpen')}
          </span>
        </div>
      )}

      <button
        className={`${styles.actionBtn} ${styles.probeBtn}`}
        onClick={handleProbeZ}
        disabled={!isConnected || probePhase !== 'idle' || probePin || !circuitTested}
        title={t('zeroGoto.probeZTitle')}
      >
        {probePhase === 'running' ? t('zeroGoto.probeRunning') : t('zeroGoto.probeZ')}
      </button>

      {probePhase === 'confirm' && (
        <div className={`${styles.probeResult} ${styles.probeSuccess}`}>
          <span className={styles.probeResultTitle}>{t('zeroGoto.probeSuccess')}</span>
          <span className={styles.probeResultMsg}>
            {t('zeroGoto.probeSuccessMsg', { thickness: displayProbeThickness, unit: isIn ? 'in' : 'mm' })}
          </span>
          <div className={styles.probeResultBtns}>
            <button className={styles.probeApplyBtn} onClick={handleApplyProbe}>
              {t('zeroGoto.probeApply')}
            </button>
            <button className={styles.probeCancelBtn} onClick={handleDismissProbe}>
              {t('zeroGoto.probeCancel')}
            </button>
          </div>
        </div>
      )}

      {probePhase === 'failed' && (
        <div className={`${styles.probeResult} ${styles.probeFailed}`}>
          <span className={styles.probeResultTitle}>{t('zeroGoto.probeFailed')}</span>
          <span className={styles.probeResultMsg}>{t('zeroGoto.probeFailedMsg')}</span>
          <div className={styles.probeResultBtns}>
            <button className={styles.probeCancelBtn} onClick={handleDismissProbe}>
              {t('zeroGoto.probeOk')}
            </button>
          </div>
        </div>
      )}

    </Panel>
  )
}
