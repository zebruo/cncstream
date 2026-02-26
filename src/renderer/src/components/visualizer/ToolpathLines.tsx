import { useMemo } from 'react'
import * as THREE from 'three'
import type { ToolpathSegment } from '@shared/types/gcode'

interface Props {
  segments: ToolpathSegment[]
  executedIndex: number
}

const RAPID_COLOR = new THREE.Color(0x00aaff)
const FEED_COLOR = new THREE.Color(0x40c057)
const EXECUTED_COLOR = new THREE.Color(0xffaa00)

function createLineGeometry(vertices: number[]): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry()
  if (vertices.length > 0) {
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    geometry.computeBoundingSphere()
  }
  return geometry
}

export function ToolpathLines({ segments, executedIndex }: Props) {
  const { rapidGeometry, feedGeometry, executedGeometry } = useMemo(() => {
    const rapidPoints: number[] = []
    const feedPoints: number[] = []
    const executedPoints: number[] = []

    for (const seg of segments) {
      const isExecuted = executedIndex >= 0 && seg.lineIndex <= executedIndex
      const targetArray = isExecuted ? executedPoints : seg.type === 'rapid' ? rapidPoints : feedPoints

      for (let i = 0; i < seg.points.length - 1; i++) {
        const [x1, y1, z1] = seg.points[i]
        const [x2, y2, z2] = seg.points[i + 1]
        // Swap Y and Z for Three.js coordinate system (Y-up)
        targetArray.push(x1, z1, -y1, x2, z2, -y2)
      }
    }

    return {
      rapidGeometry: createLineGeometry(rapidPoints),
      feedGeometry: createLineGeometry(feedPoints),
      executedGeometry: createLineGeometry(executedPoints)
    }
  }, [segments, executedIndex])

  return (
    <group>
      <lineSegments geometry={rapidGeometry}>
        <lineDashedMaterial
          color={RAPID_COLOR}
          dashSize={2}
          gapSize={1}
          opacity={0.5}
          transparent
        />
      </lineSegments>

      <lineSegments geometry={feedGeometry}>
        <lineBasicMaterial color={FEED_COLOR} />
      </lineSegments>

      <lineSegments geometry={executedGeometry}>
        <lineBasicMaterial color={EXECUTED_COLOR} />
      </lineSegments>
    </group>
  )
}
