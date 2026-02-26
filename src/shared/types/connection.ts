export interface SerialPortInfo {
  path: string
  manufacturer?: string
  serialNumber?: string
  pnpId?: string
  friendlyName?: string
  vendorId?: string
  productId?: string
}

export interface ConnectionConfig {
  path: string
  baudRate: number
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'
