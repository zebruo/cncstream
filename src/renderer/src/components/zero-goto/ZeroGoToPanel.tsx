import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Panel } from '../common/Panel'
import { useUIStore } from '../../stores/ui.store'
import { useConnectionStore } from '../../stores/connection.store'
import { useMachineStore } from '../../stores/machine.store'
import { Tooltip } from '../common/Tooltip'
import { ConfirmModal } from '../common/ConfirmModal'
import styles from './ZeroGoToPanel.module.css'
import { MM_PER_INCH } from '@shared/constants/defaults'
import { catchCommandError } from '../../lib/command-errors'
import { goToPositionCommands, goToXYZeroCommands } from '../../lib/go-to-commands'

/** Distance de recherche du palpage (mm) : au-delà, la sonde s'arrête sans contact */
const PROBE_MAX_DISTANCE = 20

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
  // Test du circuit sonde / fraise : mémorisé dans le store, le bandeau du haut l'affiche aussi
  const circuitTested = useMachineStore((s) => s.probeCircuitTested)
  // Section « Palpage Z » ouverte par défaut ; repliée, elle se résume à une pastille d'état
  const [probeOpen, setProbeOpen] = useState(false)

  // État local ajusté pendant le rendu (pas d'effet) : remis à zéro à la déconnexion.
  if (!isConnected && probePhase !== 'idle') {
    setProbePhase('idle')
  }

  // Le drapeau « Z sondé » vit dans un store partagé : sa remise à zéro reste un effet.
  useEffect(() => {
    if (!isConnected) setZProbeApplied(false)
  }, [isConnected, setZProbeApplied])

  const isIn = units === 'in'

  const displaySafeHeight = isIn ? Number.parseFloat((safeHeight / MM_PER_INCH).toFixed(4)) : safeHeight
  const handleSafeHeightChange = (val: number) => {
    if (Number.isNaN(val) || val < 0) return
    setSafeHeight(isIn ? val * MM_PER_INCH : val)
  }

  const displayProbeThickness = isIn
    ? Number.parseFloat((probeThickness / MM_PER_INCH).toFixed(4))
    : probeThickness
  const handleProbeThicknessChange = (val: number) => {
    const mm = isIn ? val * MM_PER_INCH : val
    if (Number.isNaN(mm) || mm < 0.1 || mm > 50) return
    setProbeThickness(mm)
  }

  useEffect(() => {
    return window.cncstream.onProbeResult((result) => {
      setProbePhase(result.success ? 'confirm' : 'failed')
    })
  }, [])

  const sendAll = (commands: string[]) => {
    for (const command of commands) catchCommandError(window.cncstream.sendCommand(command))
  }

  const goToXYZero = () => {
    if (!isConnected) return
    sendAll(goToXYZeroCommands(safeHeight))
  }

  const goToPosition = (x?: number, y?: number, z?: number) => {
    if (!isConnected) return
    sendAll(goToPositionCommands({ x, y, z }, safeHeight))
  }

  const handleProbeZ = () => {
    if (!isConnected || probePhase !== 'idle') return
    setProbePhase('running')
    window.cncstream.probeZ({ feedRate: 50, maxDistance: PROBE_MAX_DISTANCE, retractDistance: safeHeight }).catch(() => setProbePhase('failed'))
  }

  const handleApplyProbe = () => {
    catchCommandError(window.cncstream.sendCommand(`G10 L20 P1 Z${probeThickness + safeHeight}`))
    setZProbeApplied(true)
    setProbePhase('idle')
  }

  const handleDismissProbe = () => setProbePhase('idle')

  const unit = isIn ? 'in' : 'mm'
  const probeDisabled = !isConnected || probePhase !== 'idle' || probePin || !circuitTested

  return (
    <>
    <Panel title={t('zeroGoto.title')}>
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>{t('zeroGoto.sectionGoTo')}</h3>
        <div className={styles.row}>
          <button className={styles.actionBtn} onClick={goToXYZero} disabled={!isConnected}>
            {t('zeroGoto.goToXY')}
          </button>
          <button className={styles.actionBtn} onClick={() => goToPosition(undefined, undefined, 0)} disabled={!isConnected}>
            {t('zeroGoto.goToZ')}
          </button>
        </div>
        <div className={styles.fieldRow}>
          <Tooltip text={t('zeroGoto.safeHeightTitle')} style={{ flex: 1, minWidth: 0 }}>
            <label htmlFor="safe-height" className={styles.fieldLabel}>
              {t('zeroGoto.safeHeight', { unit })}
              <span className={styles.fieldHint}>{t('zeroGoto.safeHeightHint')}</span>
            </label>
          </Tooltip>
          <input
            id="safe-height"
            type="number"
            className={styles.input}
            value={displaySafeHeight}
            onChange={(e) => handleSafeHeightChange(Number.parseFloat(e.target.value) || 0)}
            onWheel={(e) => e.currentTarget.blur()}
            min={0}
            step={isIn ? 0.001 : 0.5}
          />
        </div>
      </section>

      <div className={styles.divider} />

      <section className={styles.section}>
        <button
          className={styles.sectionToggle}
          onClick={() => setProbeOpen((open) => !open)}
          aria-expanded={probeOpen}
          aria-controls="probe-section"
        >
          <span className={styles.sectionTitle}>{t('zeroGoto.sectionProbe')}</span>
          <span className={styles.toggleRight}>
            {!probeOpen && (
              <span className={`${styles.chip} ${circuitTested ? styles.chipOk : ''}`}>
                <span className={styles.chipDot} />
                {circuitTested ? t('zeroGoto.chipTested') : t('zeroGoto.chipNotTested')}
              </span>
            )}
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d={probeOpen ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'} />
            </svg>
          </span>
        </button>

        {probeOpen && (
          <div id="probe-section" className={styles.sectionBody}>
            <div className={styles.fieldRow}>
              <Tooltip text={t('zeroGoto.probeThicknessTitle')} style={{ flex: 1, minWidth: 0 }}>
                <label htmlFor="probe-thickness" className={styles.fieldLabel}>
                  {t('zeroGoto.probeThickness', { unit })}
                  <span className={styles.fieldHint}>{t('zeroGoto.probeThicknessHint')}</span>
                </label>
              </Tooltip>
              <input
                id="probe-thickness"
                type="number"
                className={styles.input}
                value={displayProbeThickness}
                onChange={(e) => handleProbeThicknessChange(Number.parseFloat(e.target.value))}
                onWheel={(e) => e.currentTarget.blur()}
                min={isIn ? 0.004 : 0.1}
                max={isIn ? 2 : 50}
                step={isIn ? 0.001 : 0.1}
              />
            </div>

            {/* Une fois le test réussi, c'est le bandeau vert du haut de l'écran qui le dit */}
            {probePhase === 'idle' && !circuitTested && (
              <div className={`${styles.probePinRow} ${styles.probePinOpen}`} role="status">
                <span className={styles.probePinDot} />
                <span className={styles.probePinText}>{t('zeroGoto.probeCircuitOpen')}</span>
              </div>
            )}

            <Tooltip text={t('zeroGoto.probeZTitle')} style={{ display: 'block' }}>
              <button
                className={`${styles.actionBtn} ${styles.probeBtn}`}
                onClick={handleProbeZ}
                disabled={probeDisabled}
              >
                {probePhase === 'running' ? t('zeroGoto.probeRunning') : t('zeroGoto.probeZ')}
              </button>
            </Tooltip>
            {!circuitTested && <p className={styles.note}>{t('zeroGoto.probeZHint')}</p>}
          </div>
        )}
      </section>
    </Panel>

    <ConfirmModal
      isOpen={probePhase === 'confirm'}
      variant="success"
      title={t('zeroGoto.probeSuccess')}
      message={t('zeroGoto.probeSuccessMsg', { thickness: displayProbeThickness, unit })}
      confirmLabel={t('zeroGoto.probeApply')}
      cancelLabel={t('zeroGoto.probeCancel')}
      onConfirm={handleApplyProbe}
      onCancel={handleDismissProbe}
    />
    <ConfirmModal
      isOpen={probePhase === 'failed'}
      variant="error"
      title={t('zeroGoto.probeFailed')}
      message={t('zeroGoto.probeFailedMsg', { distance: PROBE_MAX_DISTANCE })}
      confirmLabel={t('zeroGoto.probeOk')}
      onConfirm={handleDismissProbe}
    />
    </>
  )
}
