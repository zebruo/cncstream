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

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function formatElapsed(ms: number): string {
  return formatTime(ms / 1000)
}

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
  const [pendingStart, setPendingStart] = useState(false)
  const [pendingSpindleWarning, setPendingSpindleWarning] = useState(false)
  const [pendingSpindleReady, setPendingSpindleReady] = useState(false)

  useEffect(() => {
    if (pendingSpindleWarning && spindleOn) {
      setPendingSpindleWarning(false)
      setPendingSpindleReady(true)
    }
  }, [spindleOn, pendingSpindleWarning])

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
    if (!zProbeApplied) {
      setPendingStart(true)
      return
    }
    if (needsSpindleWarning) {
      setPendingSpindleWarning(true)
      return
    }
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
              pendingStart ? (
                <div className={styles.probeWarning}>
                  <span className={styles.probeWarningText}>{t('gcode.probeWarningMsg')}</span>
                  <div className={styles.probeWarningBtns}>
                    <button className={styles.startBtn} onClick={() => {
                      setPendingStart(false)
                      if (needsSpindleWarning) { setPendingSpindleWarning(true) } else { startJob() }
                    }}>
                      {t('gcode.probeWarningConfirm')}
                    </button>
                    <button className={styles.cancelBtn} onClick={() => setPendingStart(false)}>
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              ) : pendingSpindleWarning ? (
                <div className={styles.probeWarning}>
                  <span className={styles.probeWarningText}>{t('gcode.spindleWarningMsg')}</span>
                  <div className={styles.probeWarningBtns}>
                    <button className={styles.startBtn} onClick={() => { setPendingSpindleWarning(false); startJob() }}>
                      {t('gcode.spindleWarningConfirm')}
                    </button>
                    <button className={styles.cancelBtn} onClick={() => setPendingSpindleWarning(false)}>
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              ) : pendingSpindleReady ? (
                <div className={styles.probeWarning}>
                  <span className={styles.probeWarningText}>{t('gcode.spindleReadyMsg')}</span>
                  <div className={styles.probeWarningBtns}>
                    <button className={styles.startBtn} onClick={() => { setPendingSpindleReady(false); startJob() }}>
                      {t('gcode.spindleReadyConfirm')}
                    </button>
                    <button className={styles.cancelBtn} onClick={() => setPendingSpindleReady(false)}>
                      {t('common.cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className={styles.startBtn}
                  onClick={handleStartJob}
                  disabled={!isConnected}
                >
                  {t('gcode.startJob')}
                </button>
              )
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
              <span className={styles.insightValue}>{formatTime(fileInsight.estimatedTimeSeconds)}</span>
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
                {fileInsight.spindleRange.min}-{fileInsight.spindleRange.max}
              </span>
            </div>
            {fileInsight.toolInfo.length > 0 && (
              <div className={styles.insightItem}>
                <span className={styles.insightLabel}>{t('gcode.tools')}</span>
                <span className={styles.insightValue}>
                  {fileInsight.toolInfo.map((t) => {
                    let label = `T${t.number}`
                    if (t.diameter) label += ` ⌀ ${t.diameter}`
                    if (t.name) label += ` ${t.name}`
                    return label
                  }).join(', ')}
                </span>
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
                  <span>{formatElapsed(elapsedMs)}</span>
                  {estimatedRemainingMs > 0 && <span>~{formatElapsed(estimatedRemainingMs)} {t('gcode.left')}</span>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}


    </div>
  )
}
