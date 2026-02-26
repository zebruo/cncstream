import { useEffect } from 'react'
import { useJogStore } from '../stores/jog.store'
import { useJobStore } from '../stores/job.store'
import { useConnectionStore } from '../stores/connection.store'
import { useUIStore } from '../stores/ui.store'
import { useMachineStore } from '../stores/machine.store'

export function useKeyboardShortcuts(): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F1: toggle help (works from anywhere, even input fields)
      if (e.key === 'F1') {
        e.preventDefault()
        const ui = useUIStore.getState()
        ui.setHelpOpen(!ui.helpOpen)
        return
      }

      // Don't capture when typing in input fields
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return
      }

      const isConnected = useConnectionStore.getState().state === 'connected'
      const jog = useJogStore.getState()
      const job = useJobStore.getState()

      // Jogging shortcuts (only when connected)
      if (isConnected) {
        switch (e.key) {
          case 'ArrowRight':
            e.preventDefault()
            jog.jogXY(1, 0)
            return
          case 'ArrowLeft':
            e.preventDefault()
            jog.jogXY(-1, 0)
            return
          case 'ArrowUp':
            e.preventDefault()
            jog.jogXY(0, 1)
            return
          case 'ArrowDown':
            e.preventDefault()
            jog.jogXY(0, -1)
            return
          case 'PageUp':
            e.preventDefault()
            jog.jogZ(1)
            return
          case 'PageDown':
            e.preventDefault()
            jog.jogZ(-1)
            return
        }
      }

      // Step size shortcuts
      if (e.key === ']') {
        e.preventDefault()
        const presets = [0.01, 0.1, 1, 10, 100]
        const current = jog.stepSize
        const idx = presets.indexOf(current)
        if (idx < presets.length - 1) {
          jog.setStepSize(presets[idx + 1])
        }
        return
      }
      if (e.key === '[') {
        e.preventDefault()
        const presets = [0.01, 0.1, 1, 10, 100]
        const current = jog.stepSize
        const idx = presets.indexOf(current)
        if (idx > 0) {
          jog.setStepSize(presets[idx - 1])
        }
        return
      }

      // Machine control shortcuts (Ctrl+key)
      if (e.ctrlKey && isConnected) {
        switch (e.key.toLowerCase()) {
          case 'h':
            e.preventDefault()
            window.cncstream.home()
            return
          case 'u':
            e.preventDefault()
            window.cncstream.unlock()
            return
        }

        if (e.shiftKey) {
          switch (e.key.toLowerCase()) {
            case 'r':
              e.preventDefault()
              window.cncstream.reset()
              return
            case 'x':
              e.preventDefault()
              job.stopJob()
              return
          }
        }
      }

      // Feed hold (space bar when not in input)
      // Only allow feedHold when machine is actually running (not idle/transitioning)
      if (e.key === ' ' && isConnected) {
        e.preventDefault()
        const machineState = useMachineStore.getState().machineState
        if (machineState === 'Run' || machineState === 'Jog') {
          window.cncstream.feedHold()
        }
        return
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      const jog = useJogStore.getState()
      if (jog.mode === 'continuous') {
        if (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown'].includes(e.key)) {
          jog.cancelJog()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])
}
