import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useJobStore } from '../../stores/job.store'
import { useVisualizationStore } from '../../stores/visualization.store'
import { useConnectionStore } from '../../stores/connection.store'
import { useUIStore } from '../../stores/ui.store'
import { useMachineStore } from '../../stores/machine.store'
import { parseGCode } from '../../lib/gcode/parser'
import { analyzeGCode } from '../../lib/gcode/analyzer'
import { buildToolpath } from '../../lib/gcode/toolpath-builder'
import styles from './GCodePanel.module.css'
import { ConfirmModal } from '../common/ConfirmModal'
import { formatDuration } from '../../lib/format-duration'

export function GCodePanel() {
  const { t } = useTranslation()
  const {
    state: jobState,
    fileName,
    fileInsight,
    percentComplete,
    elapsedMs,
    estimatedRemainingMs,
    acknowledgedLines,
    totalLines,
    setFile,
    startJob,
    pauseJob,
    resumeJob,
    stopJob
  } = useJobStore()

  const setToolpath = useVisualizationStore((s) => s.setToolpath)
  const clearViz = useVisualizationStore((s) => s.clear)
  const isConnected = useConnectionStore((s) => s.state) === 'connected'
  const zProbeApplied = useUIStore((s) => s.zProbeApplied)
  const accessories = useMachineStore((s) => s.accessories)
  const spindleOn = accessories.spindleCW || accessories.spindleCCW
  type StartPhase = 'idle' | 'probeWarning' | 'spindleWarning' | 'spindleReady'
  const [startPhase, setStartPhase] = useState<StartPhase>('idle')

  useEffect(() => {
    if (startPhase === 'spindleWarning' && spindleOn) {
      setStartPhase('spindleReady')
    }
  }, [spindleOn, startPhase])

  const handleOpenFile = useCallback(async () => {
    const result = await window.cncstream.openFileDialog()
    if (!result) return

    const pathParts = result.path.replace(/\\/g, '/').split('/')
    const name = pathParts[pathParts.length - 1]

    const parsed = parseGCode(result.content)
    const insight = analyzeGCode(parsed)
    const segments = buildToolpath(parsed.movements)

    setFile(result.path, name, result.content, insight)
    setToolpath(segments, {
      min: [insight.boundingBox.min.x, insight.boundingBox.min.y, insight.boundingBox.min.z],
      max: [insight.boundingBox.max.x, insight.boundingBox.max.y, insight.boundingBox.max.z]
    })
  }, [setFile, setToolpath])

  const handleClose = () => {
    useJobStore.getState().clearFile()
    clearViz()
  }

  const gcodeUsesSpindle = (fileInsight?.spindleRange.max ?? 0) > 0
  const needsSpindleWarning = gcodeUsesSpindle && !spindleOn

  const handleStartJob = () => {
    if (!zProbeApplied) { setStartPhase('probeWarning'); return }
    if (needsSpindleWarning) { setStartPhase('spindleWarning'); return }
    startJob()
  }

  return (
    <div className={styles.panel}>
      {/* File controls */}
      <div className={styles.fileRow}>
        <button className={styles.openBtn} onClick={handleOpenFile} disabled={jobState === 'running' || jobState === 'paused'}>
          {t('gcode.openFile')}
        </button>
        {fileName && (
          <div className={styles.jobControls}>
            {jobState === 'idle' || jobState === 'completed' ? (
              <button
                className={styles.startBtn}
                onClick={handleStartJob}
                disabled={!isConnected}
              >
                {t('gcode.startJob')}
              </button>
            ) : jobState === 'running' ? (
              <>
                <button className={styles.pauseBtn} onClick={pauseJob}>
                  {t('common.pause')}
                </button>
                <button className={styles.stopBtn} onClick={stopJob}>
                  {t('common.stop')}
                </button>
              </>
            ) : jobState === 'paused' ? (
              <>
                <button className={styles.resumeBtn} onClick={resumeJob}>
                  {t('common.resume')}
                </button>
                <button className={styles.stopBtn} onClick={stopJob}>
                  {t('common.stop')}
                </button>
              </>
            ) : null}
          </div>
        )}
      </div>

      {/* File insight */}
      {fileInsight && (
        <div className={styles.insight}>
          {fileName && (
            <div className={styles.fileNameRow}>
              <span className={styles.fileName}>{fileName}</span>
              <button className={styles.closeBtn} onClick={handleClose} title={t('gcode.closeFile')}>
                X
              </button>
            </div>
          )}
          <div className={styles.insightGrid}>
            <div className={styles.insightItem}>
              <span className={styles.insightLabel}>{t('gcode.lines')}</span>
              <span className={styles.insightValue}>{fileInsight.lineCount}</span>
            </div>
            <div className={styles.insightItem}>
              <span className={styles.insightLabel}>{t('gcode.estTime')}</span>
              <span className={styles.insightValue}>{formatDuration(fileInsight.estimatedTimeSeconds)}</span>
            </div>
            <div className={styles.insightItem}>
              <span className={styles.insightLabel}>{t('gcode.feed')}</span>
              <span className={styles.insightValue}>
                {fileInsight.feedRange.min}-{fileInsight.feedRange.max}
              </span>
            </div>
            <div className={styles.insightItem}>
              <span className={styles.insightLabel}>{t('gcode.spindle')}</span>
              <span className={styles.insightValue}>
                {fileInsight.spindleRange.min === fileInsight.spindleRange.max
                  ? fileInsight.spindleRange.max
                  : `${fileInsight.spindleRange.min}-${fileInsight.spindleRange.max}`}
              </span>
            </div>
{fileInsight.toolInfo.some((t) => t.diameter) && (
              <div className={styles.insightItem}>
                <span className={styles.insightLabel}>{t('gcode.toolDiameter')}</span>
                <span className={styles.insightValue}>
                  {fileInsight.toolInfo.filter((t) => t.diameter).map((t) => `⌀ ${t.diameter} mm`).join(', ')}
                </span>
              </div>
            )}
            {fileInsight.stockThickness !== null && (
              <div className={styles.insightItem}>
                <span className={styles.insightLabel}>{t('gcode.stockDepth')}</span>
                <span className={styles.insightValue}>{fileInsight.stockThickness.toFixed(1)} mm</span>
              </div>
            )}
          </div>

          <div className={styles.bottomRow}>
            <table className={styles.travelTable}>
              <thead>
                <tr>
                  <th>{t('gcode.axis')}</th>
                  <th>{t('gcode.travel')}</th>
                  <th>{t('gcode.min')}</th>
                  <th>{t('gcode.max')}</th>
                </tr>
              </thead>
              <tbody>
                {(['x', 'y', 'z'] as const).map((axis) => (
                  <tr key={axis}>
                    <td className={styles.axisCell}>{axis.toUpperCase()}</td>
                    <td>{fileInsight.dimensions[axis].toFixed(1)}</td>
                    <td>{fileInsight.boundingBox.min[axis].toFixed(1)}</td>
                    <td>{fileInsight.boundingBox.max[axis].toFixed(1)}</td>
                  </tr>
                ))}
                {fileInsight.safeZ !== null && (
                  <tr>
                    <td className={styles.axisCell}>Safe Z</td>
                    <td>{fileInsight.safeZ.toFixed(1)}</td>
                    <td colSpan={2}></td>
                  </tr>
                )}
              </tbody>
            </table>

            {jobState !== 'idle' && totalLines > 0 && (
              <div className={styles.progress}>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${percentComplete}%` }}
                  />
                </div>
                <div className={styles.progressInfo}>
                  <span>{t('gcode.linesProgress', { acknowledged: acknowledgedLines, total: totalLines })}</span>
                  <span>{percentComplete.toFixed(1)}%</span>
                  <span>{formatDuration(elapsedMs / 1000)}</span>
                  {estimatedRemainingMs > 0 && <span>~{formatDuration(estimatedRemainingMs / 1000)} {t('gcode.left')}</span>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}


      <ConfirmModal
        isOpen={startPhase === 'probeWarning'}
        variant="warning"
        title={t('gcode.probeWarningTitle')}
        message={t('gcode.probeWarningMsg')}
        confirmLabel={t('gcode.probeWarningConfirm')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => {
          if (needsSpindleWarning) { setStartPhase('spindleWarning') } else { setStartPhase('idle'); startJob() }
        }}
        onCancel={() => setStartPhase('idle')}
      />
      <ConfirmModal
        isOpen={startPhase === 'spindleWarning'}
        variant="warning"
        title={t('gcode.spindleWarningTitle')}
        message={t('gcode.spindleWarningMsg')}
        confirmLabel={t('gcode.spindleWarningConfirm')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => { setStartPhase('idle'); startJob() }}
        onCancel={() => setStartPhase('idle')}
      />
      <ConfirmModal
        isOpen={startPhase === 'spindleReady'}
        variant="success"
        title={t('gcode.spindleReadyTitle')}
        message={t('gcode.spindleReadyMsg')}
        confirmLabel={t('gcode.spindleReadyConfirm')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => { setStartPhase('idle'); startJob() }}
        onCancel={() => setStartPhase('idle')}
      />
    </div>
  )
}
