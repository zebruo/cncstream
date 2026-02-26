import { useMemo, CSSProperties } from 'react'
import { Html } from '@react-three/drei'
import { useUIStore } from '../../stores/ui.store'

interface Props {
  bbox: { min: [number, number, number]; max: [number, number, number] } | null
}

const labelStyle: CSSProperties = {
  color: '#888',
  fontSize: '11px',
  fontFamily: 'monospace',
  userSelect: 'none',
  pointerEvents: 'none',
  whiteSpace: 'nowrap'
}

const axisStyle = (color: string): CSSProperties => ({
  ...labelStyle,
  color,
  fontSize: '13px',
  fontWeight: 600
})

export function WorkAreaGrid({ bbox }: Props) {
  const units = useUIStore((s) => s.units)
  const { gridSize, yOffset } = useMemo(() => {
    if (!bbox) return { gridSize: 200, yOffset: 0 }
    const dx = bbox.max[0] - bbox.min[0]
    const dy = bbox.max[1] - bbox.min[1]
    const size = Math.max(dx, dy, 100) * 1.5
    const zMin = bbox.min[2]
    return {
      gridSize: Math.ceil(size / 10) * 10,
      yOffset: zMin < 0 ? zMin : 0
    }
  }, [bbox])

  const labelValues = useMemo(() => {
    const rawStep = gridSize / 5
    const niceSteps = [1, 2, 5, 10, 20, 50, 100, 200, 500]
    const step = niceSteps.find((s) => s >= rawStep) || rawStep
    const values: number[] = []
    for (let v = 0; v <= gridSize; v += step) values.push(v)
    return values
  }, [gridSize])

  const offset = gridSize * 0.035

  return (
    <group>
      <gridHelper
        args={[gridSize, gridSize / 10, 0x373a40, 0x2c2e33]}
        position={[gridSize / 2, yOffset, -gridSize / 2]}
      />

      {/* X axis labels (along front edge, CNC Y = 0) */}
      {labelValues.map((v) => (
        <Html key={`x-${v}`} position={[v, yOffset, offset]} center zIndexRange={[1, 0]}>
          <span style={labelStyle}>{v}</span>
        </Html>
      ))}

      {/* Y axis labels (along left edge, CNC X = 0) */}
      {labelValues.map((v) => (
        <Html key={`y-${v}`} position={[-offset, yOffset, -v]} center zIndexRange={[1, 0]}>
          <span style={labelStyle}>{v}</span>
        </Html>
      ))}

      {/* Axis name + unit at end of each axis */}
      <Html position={[gridSize + offset * 2, yOffset, offset]} center zIndexRange={[1, 0]}>
        <span style={axisStyle('#fa5252')}>{`X (${units})`}</span>
      </Html>
      <Html position={[-offset * 2, yOffset, -(gridSize + offset * 2)]} center zIndexRange={[1, 0]}>
        <span style={axisStyle('#40c057')}>{`Y (${units})`}</span>
      </Html>
    </group>
  )
}
