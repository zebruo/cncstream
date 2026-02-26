export interface MachineProfile {
  id: string
  name: string
  manufacturer: string
  maxTravel: { x: number; y: number; z: number }
  maxFeedRate: { x: number; y: number; z: number }
  defaultBaudRate: number
  hasHoming: boolean
  hasProbe: boolean
  supportsAAxis: boolean
  isGrblHAL: boolean
}

export const MACHINE_PROFILES: MachineProfile[] = [
  {
    id: 'generic-grbl',
    name: 'Generic GRBL Machine',
    manufacturer: 'Generic',
    maxTravel: { x: 300, y: 300, z: 80 },
    maxFeedRate: { x: 5000, y: 5000, z: 3000 },
    defaultBaudRate: 115200,
    hasHoming: false,
    hasProbe: false,
    supportsAAxis: false,
    isGrblHAL: false
  },
  {
    id: 'generic-grblhal',
    name: 'Generic grblHAL Machine',
    manufacturer: 'Generic',
    maxTravel: { x: 500, y: 500, z: 100 },
    maxFeedRate: { x: 8000, y: 8000, z: 5000 },
    defaultBaudRate: 115200,
    hasHoming: true,
    hasProbe: true,
    supportsAAxis: true,
    isGrblHAL: true
  },
  {
    id: 'longmill-mk2-30x30',
    name: 'LongMill MK2 30x30',
    manufacturer: 'Sienci Labs',
    maxTravel: { x: 792, y: 845, z: 114 },
    maxFeedRate: { x: 4000, y: 4000, z: 3000 },
    defaultBaudRate: 115200,
    hasHoming: true,
    hasProbe: true,
    supportsAAxis: false,
    isGrblHAL: false
  },
  {
    id: 'altmill',
    name: 'AltMill',
    manufacturer: 'Sienci Labs',
    maxTravel: { x: 600, y: 600, z: 120 },
    maxFeedRate: { x: 10000, y: 10000, z: 5000 },
    defaultBaudRate: 115200,
    hasHoming: true,
    hasProbe: true,
    supportsAAxis: true,
    isGrblHAL: true
  },
  {
    id: 'shapeoko-4',
    name: 'Shapeoko 4',
    manufacturer: 'Carbide 3D',
    maxTravel: { x: 425, y: 425, z: 95 },
    maxFeedRate: { x: 10000, y: 10000, z: 5000 },
    defaultBaudRate: 115200,
    hasHoming: true,
    hasProbe: true,
    supportsAAxis: false,
    isGrblHAL: false
  },
  {
    id: 'x-carve-1000',
    name: 'X-Carve 1000mm',
    manufacturer: 'Inventables',
    maxTravel: { x: 750, y: 750, z: 65 },
    maxFeedRate: { x: 8000, y: 8000, z: 5000 },
    defaultBaudRate: 115200,
    hasHoming: true,
    hasProbe: true,
    supportsAAxis: false,
    isGrblHAL: false
  },
  {
    id: '3018-cnc',
    name: '3018 CNC / PROVer',
    manufacturer: 'SainSmart/Genmitsu',
    maxTravel: { x: 300, y: 180, z: 45 },
    maxFeedRate: { x: 5000, y: 5000, z: 3000 },
    defaultBaudRate: 115200,
    hasHoming: false,
    hasProbe: false,
    supportsAAxis: false,
    isGrblHAL: false
  },
  {
    id: 'openbuilds-lead-1010',
    name: 'OpenBuilds LEAD 1010',
    manufacturer: 'OpenBuilds',
    maxTravel: { x: 1000, y: 1000, z: 90 },
    maxFeedRate: { x: 10000, y: 10000, z: 5000 },
    defaultBaudRate: 115200,
    hasHoming: true,
    hasProbe: true,
    supportsAAxis: false,
    isGrblHAL: false
  },
  {
    id: 'onefinity-woodworker',
    name: 'Onefinity Woodworker',
    manufacturer: 'Onefinity',
    maxTravel: { x: 816, y: 816, z: 114 },
    maxFeedRate: { x: 10000, y: 10000, z: 5000 },
    defaultBaudRate: 115200,
    hasHoming: true,
    hasProbe: true,
    supportsAAxis: false,
    isGrblHAL: true
  }
]
