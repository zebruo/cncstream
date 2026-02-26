import { create } from 'zustand'
import type { SerialPortInfo, ConnectionStatus } from '@shared/types/connection'

interface ConnectionStore {
  state: ConnectionStatus
  ports: SerialPortInfo[]
  selectedPort: string | null
  baudRate: number
  firmwareVersion: string | null
  isGrblHAL: boolean
  error: string | null

  setPorts: (ports: SerialPortInfo[]) => void
  setSelectedPort: (port: string | null) => void
  setBaudRate: (rate: number) => void
  setConnectionState: (state: ConnectionStatus) => void
  setFirmwareInfo: (version: string, isGrblHAL: boolean) => void
  setError: (error: string | null) => void

  refreshPorts: () => Promise<void>
  connect: () => Promise<void>
  disconnect: () => Promise<void>
}

export const useConnectionStore = create<ConnectionStore>((set, get) => ({
  state: 'disconnected',
  ports: [],
  selectedPort: null,
  baudRate: 115200,
  firmwareVersion: null,
  isGrblHAL: false,
  error: null,

  setPorts: (ports) => set({ ports }),
  setSelectedPort: (port) => set({ selectedPort: port }),
  setBaudRate: (rate) => set({ baudRate: rate }),
  setConnectionState: (state) => set({ state, error: state === 'connected' ? null : get().error }),
  setFirmwareInfo: (version, isGrblHAL) => set({ firmwareVersion: version, isGrblHAL }),
  setError: (error) => set({ error, state: error ? 'error' : get().state }),

  refreshPorts: async () => {
    try {
      const ports = await window.cncstream.listPorts()
      set({ ports })
    } catch (e: any) {
      set({ error: e.message })
    }
  },

  connect: async () => {
    const { selectedPort, baudRate } = get()
    if (!selectedPort) return
    set({ state: 'connecting', error: null })
    try {
      await window.cncstream.connect({ path: selectedPort, baudRate })
      set({ state: 'connected' })
    } catch (e: any) {
      set({ state: 'error', error: e.message })
    }
  },

  disconnect: async () => {
    try {
      await window.cncstream.disconnect()
    } finally {
      set({ state: 'disconnected', firmwareVersion: null, isGrblHAL: false })
    }
  }
}))
