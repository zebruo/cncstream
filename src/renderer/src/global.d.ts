import type { CNCStreamAPI } from '@shared/types/ipc'

declare module '*.svg' {
  const src: string
  export default src
}

declare module '*.module.css' {
  const classes: Record<string, string>
  export default classes
}

declare global {
  interface Window {
    cncstream: CNCStreamAPI
  }
}

export {}
