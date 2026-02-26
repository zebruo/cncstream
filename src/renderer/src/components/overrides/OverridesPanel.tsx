import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Panel } from '../common/Panel'
import { useMachineStore } from '../../stores/machine.store'
import { useConnectionStore } from '../../stores/connection.store'
import { useUIStore } from '../../stores/ui.store'
import type { OverrideAction, RapidOverrideLevel } from '@shared/types/ipc'
import styles from './OverridesPanel.module.css'

function OverrideSlider({
  label,
  tooltip,
  resetLabel,
  value,
  onIncrease,
  onDecrease,
  onReset,
  disabled
}: {
  label: string
  tooltip?: string
  resetLabel: string
  value: number
  onIncrease: () => void
  onDecrease: () => void
  onReset: () => void
  disabled: boolean
}) {
  return (
    <div className={styles.override}>
      <div className={styles.overrideHeader}>
        <span className={styles.overrideLabel} title={tooltip}>{label}</span>
        <span className={styles.overrideValue}>{value}%</span>
      </div>
      <div className={styles.overrideBar}>
        <div className={styles.overrideFill} style={{ width: `${Math.min(value, 200)}%` }} />
      </div>
      <div className={styles.overrideBtns}>
        <button onClick={onDecrease} disabled={disabled} className={styles.ovBtn}>-10</button>
        <button onClick={onReset} disabled={disabled} className={`${styles.ovBtn} ${styles.resetBtn}`}>{resetLabel}</button>
        <button onClick={onIncrease} disabled={disabled} className={styles.ovBtn}>+10</button>
      </div>
    </div>
  )
}

export function OverridesPanel() {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const overrides = useMachineStore((s) => s.overrides)
  const isConnected = useConnectionStore((s) => s.state) === 'connected'
  const spindleMode = useUIStore((s) => s.spindleMode)

  const feedAction = (action: OverrideAction) => window.cncstream.setFeedOverride(action)
  const spindleAction = (action: OverrideAction) => window.cncstream.setSpindleOverride(action)
  const rapidAction = (level: RapidOverrideLevel) => window.cncstream.setRapidOverride(level)

  return (
    <Panel title={t('overrides.title')} onToggle={() => setExpanded((v) => !v)} expanded={expanded}>
      {expanded && (
        <div className={styles.sections}>
          <OverrideSlider
            label={t('overrides.feed')}
            tooltip={t('overrides.feedTooltip')}
            resetLabel={t('overrides.reset')}
            value={overrides.feed}
            onIncrease={() => feedAction('increase-10')}
            onDecrease={() => feedAction('decrease-10')}
            onReset={() => feedAction('reset')}
            disabled={!isConnected}
          />
          {spindleMode === 'pwm' && (
            <OverrideSlider
              label={t('overrides.spindle')}
              tooltip={t('overrides.spindleTooltip')}
              resetLabel={t('overrides.reset')}
              value={overrides.spindle}
              onIncrease={() => spindleAction('increase-10')}
              onDecrease={() => spindleAction('decrease-10')}
              onReset={() => spindleAction('reset')}
              disabled={!isConnected}
            />
          )}
          <div className={styles.rapidRow}>
            <span className={styles.overrideLabel} title={t('overrides.rapidTooltip')}>{t('overrides.rapid')}</span>
            <span className={styles.rapidValue}>{overrides.rapid}%</span>
            <div className={styles.rapidBtns}>
              {([25, 50, 100] as RapidOverrideLevel[]).map((level) => (
                <button
                  key={level}
                  className={`${styles.rapidBtn} ${overrides.rapid === level ? styles.active : ''}`}
                  onClick={() => rapidAction(level)}
                  disabled={!isConnected}
                >
                  {level}%
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </Panel>
  )
}
