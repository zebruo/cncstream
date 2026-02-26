import { useUIStore } from '../../stores/ui.store'
import { useConnectionStore } from '../../stores/connection.store'
import { useMachineStore } from '../../stores/machine.store'
import { SettingsDropdown } from './SettingsDropdown'
import styles from './Header.module.css'

const STATE_COLORS: Record<string, string> = {
  Idle: 'var(--color-state-idle)',
  Run: 'var(--color-state-run)',
  Hold: 'var(--color-state-hold)',
  Alarm: 'var(--color-state-alarm)',
  Jog: 'var(--color-state-jog)',
  Home: 'var(--color-state-home)',
  Check: 'var(--color-state-check)',
  Door: 'var(--color-state-door)',
  Sleep: 'var(--color-state-sleep)',
  Tool: 'var(--color-state-hold)'
}

export function Header() {
  const connectionState = useConnectionStore((s) => s.state)
  const machineState = useMachineStore((s) => s.machineState)
  const firmwareVersion = useConnectionStore((s) => s.firmwareVersion)

  const isConnected = connectionState === 'connected'

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <h1 className={styles.logo}>CNCStream</h1>
        {firmwareVersion && (
          <span className={styles.firmware}>{firmwareVersion}</span>
        )}
      </div>

      <div className={styles.center}>
        {isConnected && (
          <div
            className={styles.machineState}
            style={{ backgroundColor: STATE_COLORS[machineState] ?? 'var(--color-text-muted)' }}
          >
            {machineState}
          </div>
        )}
      </div>

      <div className={styles.right}>
        <SettingsDropdown />
        <button
          className={styles.helpBtn}
          onClick={() => useUIStore.getState().setHelpOpen(true)}
          title="Aide (F1)"
        >
          ?
        </button>
      </div>
    </header>
  )
}
