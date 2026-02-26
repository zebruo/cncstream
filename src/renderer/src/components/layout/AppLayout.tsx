import { useState } from 'react'
import { Header } from './Header'
import { StatusBar } from './StatusBar'
import { ConnectionPanel } from '../connection/ConnectionPanel'
import { DROPanel } from '../dro/DROPanel'
import { JogPanel } from '../jogging/JogPanel'
import { ZeroGoToPanel } from '../zero-goto/ZeroGoToPanel'
import { SpindlePanel } from '../spindle/SpindlePanel'
import { CoolantPanel } from '../coolant/CoolantPanel'
import { OverridesPanel } from '../overrides/OverridesPanel'
import { MacroPanel } from '../macros/MacroPanel'
import { GCodePanel } from '../gcode/GCodePanel'
import { ConsolePanel } from '../console/ConsolePanel'
import { VisualizerPanel } from '../visualizer/VisualizerPanel'
import styles from './AppLayout.module.css'

type BottomTab = 'gcode' | 'console'

export function AppLayout() {
  const [activeTab, setActiveTab] = useState<BottomTab>('gcode')

  return (
    <div className={styles.layout}>
      <Header />
      <div className={styles.main}>
        <div className={styles.leftPanel}>
          <ConnectionPanel />
          <DROPanel />
          <JogPanel />
          <ZeroGoToPanel />
          <SpindlePanel />
          <OverridesPanel />
          <CoolantPanel />
          <MacroPanel />
        </div>
        <div className={styles.rightPanel}>
          <VisualizerPanel />
          <div className={styles.bottomPanel}>
            <div className={styles.tabs}>
              <button
                className={`${styles.tab} ${activeTab === 'gcode' ? styles.active : ''}`}
                onClick={() => setActiveTab('gcode')}
              >
                G-Code
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'console' ? styles.active : ''}`}
                onClick={() => setActiveTab('console')}
              >
                Console
              </button>
            </div>
            <div className={styles.tabContent}>
              {activeTab === 'gcode' ? <GCodePanel /> : <ConsolePanel />}
            </div>
          </div>
        </div>
      </div>
      <StatusBar />
    </div>
  )
}
