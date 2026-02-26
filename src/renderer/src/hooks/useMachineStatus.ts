import { useEffect } from 'react'
import { useMachineStore } from '../stores/machine.store'
import { useConnectionStore } from '../stores/connection.store'
import { useJobStore } from '../stores/job.store'
import { useConsoleStore } from '../stores/console.store'

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
        setConnectionState(state as any)
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

    unsubs.push(
      window.cncstream.onJobError((error) => {
        useJobStore.getState().setError(typeof error === 'string' ? error : JSON.stringify(error))
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
