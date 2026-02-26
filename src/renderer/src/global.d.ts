import type { CNCStreamAPI } from '@shared/types/ipc'

declare module '*.svg' {
  const src: string
  export default src
}

declare global {
  interface Window {
    cncstream: CNCStreamAPI
  }
}

export {}
