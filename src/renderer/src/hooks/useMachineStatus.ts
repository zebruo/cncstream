import { useEffect } from 'react'
import { useMachineStore } from '../stores/machine.store'
import { useConnectionStore } from '../stores/connection.store'
import { useJobStore } from '../stores/job.store'
import { useConsoleStore } from '../stores/console.store'
import type { ConnectionStatus } from '@shared/types/connection'
import i18n from '../i18n'

export function useMachineStatus(): void {
  const updateFromStatus = useMachineStore((s) => s.updateFromStatus)
  const setAlarm = useMachineStore((s) => s.setAlarm)
  const clearAlarm = useMachineStore((s) => s.clearAlarm)
  const setConnectionState = useConnectionStore((s) => s.setConnectionState)
  const setFirmwareInfo = useConnectionStore((s) => s.setFirmwareInfo)
  const updateProgress = useJobStore((s) => s.updateProgress)
  const setJobState = useJobStore((s) => s.setJobState)
  const addConsoleLine = useConsoleStore((s) => s.addLine)
  const setSpindleConfig = useMachineStore((s) => s.setSpindleConfig)

  useEffect(() => {
    const unsubs: (() => void)[] = []

    unsubs.push(
      window.cncstream.onMachineStatus((status) => {
        updateFromStatus(status)
        if (status.state !== 'Alarm') {
          clearAlarm()
        }
      })
    )

    unsubs.push(
      window.cncstream.onMachineResponse((response) => {
        if (response.type === 'ok') {
          addConsoleLine('ok', 'ok')
        } else if (response.type === 'error') {
          addConsoleLine('error', `error:${response.code} ${response.message ?? ''}`)
        }
      })
    )

    unsubs.push(
      window.cncstream.onMachineAlarm((alarm) => {
        setAlarm(alarm.code, alarm.message)
        addConsoleLine('alarm', `ALARM:${alarm.code} ${alarm.message}`)
      })
    )

    unsubs.push(
      window.cncstream.onConsoleOutput((line) => {
        if (line.startsWith('> ')) {
          addConsoleLine('sent', line)
        } else {
          addConsoleLine('info', line)
        }
      })
    )

    unsubs.push(
      window.cncstream.onConnectionStateChanged((state) => {
        setConnectionState(state as ConnectionStatus)
      })
    )

    unsubs.push(
      window.cncstream.onStartupInfo((info) => {
        const current = useConnectionStore.getState().firmwareVersion
        if (current !== info.version) {
          setFirmwareInfo(info.version, info.isGrblHAL)
        }
        addConsoleLine('info', info.version)
      })
    )

    unsubs.push(
      window.cncstream.onJobProgress((progress) => {
        updateProgress(progress)
      })
    )

    unsubs.push(
      window.cncstream.onJobCompleted(() => {
        setJobState('completed')
      })
    )

    // L'erreur de chaque ligne est déjà affichée dans la console (« error:N ») : l'état du
    // job n'en dépend plus. Seule la pause automatique (ci-dessous) change l'état.
    unsubs.push(
      window.cncstream.onJobPausedOnError((info) => {
        setJobState('paused')
        addConsoleLine(
          'error',
          i18n.t('gcode.pausedOnError', {
            line: info.lineNumber + 1,
            command: info.command,
            error: info.error
          })
        )
      })
    )

    unsubs.push(
      window.cncstream.onSpindleConfig((config) => {
        setSpindleConfig(config.maxRpm, config.minRpm)
        addConsoleLine('info', `Spindle config: max=${config.maxRpm} RPM, min=${config.minRpm} RPM`)
      })
    )

    return () => {
      unsubs.forEach((fn) => fn())
    }
  }, [updateFromStatus, setAlarm, clearAlarm, setConnectionState, setFirmwareInfo, updateProgress, setJobState, addConsoleLine, setSpindleConfig])
}
