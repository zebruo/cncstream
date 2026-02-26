import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Panel } from '../common/Panel'
import { useMachineStore } from '../../stores/machine.store'
import { useUIStore } from '../../stores/ui.store'
import { useConnectionStore } from '../../stores/connection.store'
import styles from './DROPanel.module.css'

const AXES = ['X', 'Y', 'Z', 'A'] as const
const AXIS_COLORS = {
  X: 'var(--color-axis-x)',
  Y: 'var(--color-axis-y)',
  Z: 'var(--color-axis-z)',
  A: 'var(--color-axis-a)'
}

function formatCoord(value: number, units: 'mm' | 'in'): string {
  if (units === 'mm') {
    return value.toFixed(3)
  }
  return (value / 25.4).toFixed(4)
}

export function DROPanel() {
  const { t } = useTranslation()
  const wpos = useMachineStore((s) => s.wpos)
  const mpos = useMachineStore((s) => s.mpos)
  const units = useUIStore((s) => s.units)
  const showAAxis = useUIStore((s) => s.showAAxis)
  const isConnected = useConnectionStore((s) => s.state) === 'connected'
  const [showMPos, setShowMPos] = useState(false)
  const [editingAxis, setEditingAxis] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const pos = showMPos ? mpos : wpos
  const axes = showAAxis ? AXES : AXES.slice(0, 3)

  const handleZero = (axis: string) => {
    if (!isConnected) return
    window.cncstream.sendCommand(`G10 L20 P1 ${axis}0`)
  }

  const handleZeroAll = () => {
    if (!isConnected) return
    const axisStr = axes.map((a) => `${a}0`).join(' ')
    window.cncstream.sendCommand(`G10 L20 P1 ${axisStr}`)
  }

  const handleStartEdit = (axis: string, value: number) => {
    setEditingAxis(axis)
    setEditValue(String(units === 'mm' ? value : value / 25.4))
  }

  const handleConfirmEdit = (axis: string) => {
    if (!isConnected) return
    const val = parseFloat(editValue)
    if (isNaN(val)) {
      setEditingAxis(null)
      return
    }
    const mmVal = units === 'mm' ? val : val * 25.4
    window.cncstream.sendCommand(`G10 L20 P1 ${axis}${mmVal.toFixed(4)}`)
    setEditingAxis(null)
  }

  return (
    <Panel
      title="Position"
      actions={
        <div className={styles.headerActions}>
          <button
            className={`${styles.posToggle} ${showMPos ? styles.active : ''}`}
            onClick={() => setShowMPos(!showMPos)}
            title={showMPos ? t('dro.machinePosTitle') : t('dro.workPosTitle')}
          >
            {showMPos ? 'MachinePos' : 'WorkPos'}
          </button>
          <button
            className={styles.zeroAllBtn}
            onClick={handleZeroAll}
            disabled={!isConnected}
          >
            Zero All
          </button>
        </div>
      }
    >
      <div className={styles.dro}>
        {axes.map((axis) => {
          const value = pos[axis.toLowerCase() as keyof typeof pos]
          const isEditing = editingAxis === axis

          return (
            <div key={axis} className={styles.axisRow}>
              <div className={styles.axisLabel} style={{ color: AXIS_COLORS[axis] }}>
                {axis}
              </div>
              {isEditing ? (
                <input
                  className={styles.editInput}
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleConfirmEdit(axis)
                    if (e.key === 'Escape') setEditingAxis(null)
                  }}
                  onBlur={() => setEditingAxis(null)}
                  autoFocus
                />
              ) : (
                <div
                  className={styles.axisValue}
                  onDoubleClick={() => handleStartEdit(axis, value)}
                  title="Double-click to edit"
                >
                  {formatCoord(value, units)}
                </div>
              )}
              <button
                className={styles.zeroBtn}
                onClick={() => handleZero(axis)}
                disabled={!isConnected}
                title={`Zero ${axis}`}
              >
                {axis}<sub> 0</sub>
              </button>
            </div>
          )
        })}
      </div>
    </Panel>
  )
}
