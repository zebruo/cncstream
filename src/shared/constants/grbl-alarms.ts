export interface AlarmDescription {
  name: string
  description: string
}

export const GRBL_ALARMS: Record<number, AlarmDescription> = {
  1: {
    name: 'Hard limit triggered',
    description: 'Hard limit has been triggered. Machine position is likely lost due to sudden and immediate halt. Re-homing is highly recommended.'
  },
  2: {
    name: 'Soft limit alarm',
    description: 'G-code motion target exceeds machine travel. Machine position safely retained. Alarm may be unlocked.'
  },
  3: {
    name: 'Reset while in motion',
    description: 'Reset while in motion. Grbl cannot guarantee position. Lost steps are likely. Re-homing is highly recommended.'
  },
  4: {
    name: 'Probe fail',
    description: 'Probe fail. The probe is not in the expected initial state before starting probe cycle, because G38.2 and G38.3 is not triggered and G38.4 and G38.5 is triggered.'
  },
  5: {
    name: 'Probe fail',
    description: 'Probe fail. The probe did not contact the workpiece within the programmed travel for G38.2 and G38.4.'
  },
  6: {
    name: 'Homing fail',
    description: 'Homing fail. Reset during active homing cycle.'
  },
  7: {
    name: 'Homing fail',
    description: 'Homing fail. Safety door was opened during active homing cycle.'
  },
  8: {
    name: 'Homing fail',
    description: 'Homing fail. Cycle failed to clear limit switch when pulling off. Try increasing pull-off setting or check wiring.'
  },
  9: {
    name: 'Homing fail',
    description: 'Homing fail. Could not find limit switch within search distance. Defined as 1.5 * max_travel on search and 5 * pulloff on locate phases.'
  },
  10: {
    name: 'Homing fail',
    description: 'Homing fail. On dual axis machines, could not find the second limit switch for self-squaring.'
  }
}
