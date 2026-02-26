import { SerialPort } from 'serialport'
import { ReadlineParser } from '@serialport/parser-readline'
import { EventEmitter } from 'events'
import type { SerialPortInfo } from '@shared/types/connection'

export interface SerialPortConfig {
  path: string
  baudRate: number
}

export class SerialPortService extends EventEmitter {
  private port: SerialPort | null = null
  private parser: ReadlineParser | null = null

  async listPorts(): Promise<SerialPortInfo[]> {
    const ports = await SerialPort.list()
    return ports.map((p) => ({
      path: p.path,
      manufacturer: p.manufacturer,
      serialNumber: p.serialNumber,
      pnpId: p.pnpId,
      friendlyName: p.friendlyName,
      vendorId: p.vendorId,
      productId: p.productId
    }))
  }

  async open(config: SerialPortConfig): Promise<void> {
    if (this.port?.isOpen) {
      await this.close()
    }

    this.port = new SerialPort({
      path: config.path,
      baudRate: config.baudRate,
      autoOpen: false
    })

    this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\r\n' }))

    this.parser.on('data', (line: string) => {
      this.emit('line', line)
    })

    this.port.on('close', () => this.emit('close'))
    this.port.on('error', (err: Error) => this.emit('error', err))

    return new Promise<void>((resolve, reject) => {
      this.port!.open((err) => {
        if (err) {
          reject(err)
        } else {
          resolve()
        }
      })
    })
  }

  write(data: string): boolean {
    if (!this.port?.isOpen) return false
    this.port.write(data)
    return true
  }

  writeRealtime(byte: number): boolean {
    if (!this.port?.isOpen) return false
    this.port.write(Buffer.from([byte]))
    this.port.drain(() => {})
    return true
  }

  async close(): Promise<void> {
    return new Promise<void>((resolve) => {
      if (!this.port?.isOpen) {
        resolve()
        return
      }
      this.port.close((err) => {
        this.port = null
        this.parser = null
        resolve()
      })
    })
  }

  get isOpen(): boolean {
    return this.port?.isOpen ?? false
  }
}
