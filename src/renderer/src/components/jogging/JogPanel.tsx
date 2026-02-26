import { useTranslation } from 'react-i18next'
import { Panel } from '../common/Panel'
import { useJogStore } from '../../stores/jog.store'
import { useConnectionStore } from '../../stores/connection.store'
import { useUIStore } from '../../stores/ui.store'
import { DEFAULT_JOG_STEP_PRESETS, DEFAULT_JOG_SPEED_PRESETS } from '@shared/constants/defaults'
import upleftIcon from '../../assets/icons/upleft.svg'
import upIcon from '../../assets/icons/up.svg'
import uprightIcon from '../../assets/icons/upright.svg'
import leftIcon from '../../assets/icons/left.svg'
import rightIcon from '../../assets/icons/right.svg'
import downleftIcon from '../../assets/icons/downleft.svg'
import downIcon from '../../assets/icons/down.svg'
import downrightIcon from '../../assets/icons/downright.svg'
import centerjogIcon from '../../assets/icons/centerjog.svg'
import styles from './JogPanel.module.css'

const MM_PER_INCH = 25.4
const JOG_STEP_PRESETS_IN = [0.001, 0.010, 0.050, 0.100, 0.500, 1.000] as const
const JOG_SPEED_PRESETS_IN = [1, 5, 10, 50, 100, 200] as const

const XY_DIRECTIONS = [
  { dx: -1, dy: 1, icon: upleftIcon, pos: 'tl' },
  { dx: 0, dy: 1, icon: upIcon, pos: 'tc' },
  { dx: 1, dy: 1, icon: uprightIcon, pos: 'tr' },
  { dx: -1, dy: 0, icon: leftIcon, pos: 'ml' },
  { dx: 0, dy: 0, icon: centerjogIcon, pos: 'mc' },
  { dx: 1, dy: 0, icon: rightIcon, pos: 'mr' },
  { dx: -1, dy: -1, icon: downleftIcon, pos: 'bl' },
  { dx: 0, dy: -1, icon: downIcon, pos: 'bc' },
  { dx: 1, dy: -1, icon: downrightIcon, pos: 'br' }
]

export function JogPanel() {
  const { t } = useTranslation()
  const { mode, stepSize, feedRate, setMode, setStepSize, setFeedRate, jogXY, jogZ, jogA, cancelJog } = useJogStore()
  const isConnected = useConnectionStore((s) => s.state) === 'connected'
  const units = useUIStore((s) => s.units)
  const showAAxis = useUIStore((s) => s.showAAxis)
  const isIn = units === 'in'

  const stepPresets = isIn ? JOG_STEP_PRESETS_IN : DEFAULT_JOG_STEP_PRESETS
  const feedPresets = isIn ? JOG_SPEED_PRESETS_IN : DEFAULT_JOG_SPEED_PRESETS

  const handleSetStep = (val: number) => setStepSize(isIn ? val * MM_PER_INCH : val)
  const handleSetFeed = (val: number) => setFeedRate(isIn ? val * MM_PER_INCH : val)
  const isStepActive = (val: number) => Math.abs(stepSize - (isIn ? val * MM_PER_INCH : val)) < 1e-4
  const isFeedActive = (val: number) => Math.abs(feedRate - (isIn ? val * MM_PER_INCH : val)) < 1e-4

  const handleJogXY = (dx: number, dy: number) => {
    if (!isConnected || (dx === 0 && dy === 0)) return
    jogXY(dx, dy)
  }

  const handleMouseUp = () => {
    if (mode === 'continuous') cancelJog()
  }

  return (
    <Panel title={t('jog.title')}>
      {/* Mode toggle */}
      <div className={styles.modeRow}>
        <button
          className={`${styles.modeBtn} ${mode === 'incremental' ? styles.active : ''}`}
          onClick={() => setMode('incremental')}
        >
          {t('jog.incremental')}
        </button>
        <button
          className={`${styles.modeBtn} ${mode === 'continuous' ? styles.active : ''}`}
          onClick={() => setMode('continuous')}
        >
          {t('jog.continuous')}
        </button>
      </div>

      {/* XY Jog Pad + Z controls */}
      <div className={styles.jogArea}>
        <div className={styles.xyPad}>
          {XY_DIRECTIONS.map((dir) => (
            <button
              key={dir.pos}
              className={`${styles.jogBtn} ${styles[dir.pos]} ${dir.dx === 0 && dir.dy === 0 ? styles.center : ''}`}
              onMouseDown={() => handleJogXY(dir.dx, dir.dy)}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              disabled={!isConnected || (dir.dx === 0 && dir.dy === 0)}
              title={dir.dx === 0 && dir.dy === 0 ? t('jog.keyboardShortcuts') : `Jog ${dir.dx !== 0 ? (dir.dx > 0 ? 'X+' : 'X-') : ''}${dir.dy !== 0 ? (dir.dy > 0 ? 'Y+' : 'Y-') : ''}`}
            >
              <img src={dir.icon} alt="" className={dir.dx === 0 && dir.dy === 0 ? styles.centerIcon : styles.jogIcon} />
            </button>
          ))}
        </div>

        <div className={styles.zControls}>
          <button
            className={`${styles.jogBtn} ${styles.zBtn}`}
            onMouseDown={() => isConnected && jogZ(1)}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            disabled={!isConnected}
            title="Z+"
          >
            Z+
          </button>
          <button
            className={`${styles.jogBtn} ${styles.zBtn}`}
            onMouseDown={() => isConnected && jogZ(-1)}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            disabled={!isConnected}
            title="Z-"
          >
            Z-
          </button>
        </div>

        {showAAxis && (
          <div className={styles.aControls}>
            <button
              className={`${styles.jogBtn} ${styles.aBtn}`}
              onMouseDown={() => isConnected && jogA(1)}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              disabled={!isConnected}
              title="A+"
            >
              A+
            </button>
            <button
              className={`${styles.jogBtn} ${styles.aBtn}`}
              onMouseDown={() => isConnected && jogA(-1)}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              disabled={!isConnected}
              title="A-"
            >
              A-
            </button>
          </div>
        )}
      </div>

      {/* Step size presets — hidden in continuous mode */}
      {mode === 'incremental' && (
        <div className={styles.presetSection}>
          <span className={styles.presetLabel}>{t('jog.step', { unit: isIn ? 'in' : 'mm' })}</span>
          <div className={styles.presetRow}>
            {stepPresets.map((size) => (
              <button
                key={size}
                className={`${styles.presetBtn} ${isStepActive(size) ? styles.active : ''}`}
                onClick={() => handleSetStep(size)}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Feed rate presets */}
      <div className={styles.presetSection}>
        <span className={styles.presetLabel}>{t('jog.feed', { unit: isIn ? 'ipm' : 'mm/min' })}</span>
        <div className={styles.presetRow}>
          {feedPresets.map((rate) => (
            <button
              key={rate}
              className={`${styles.presetBtn} ${isFeedActive(rate) ? styles.active : ''}`}
              onClick={() => handleSetFeed(rate)}
            >
              {rate}
            </button>
          ))}
        </div>
      </div>
    </Panel>
  )
}
