import { useMemo, useRef, CSSProperties } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { useUIStore } from '../../stores/ui.store'

interface Props {
  bbox: { min: [number, number, number]; max: [number, number, number] } | null
  /**
   * Vue de côté : la grille est vue par la tranche, les graduations se posent sur Z = 0.
   * 'xz' montre l'axe X, 'yz' l'axe Y ; l'autre axe part vers le fond de l'écran.
   */
  sideView?: 'xz' | 'yz' | null
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

/*
 * Les étiquettes sont du HTML posé sur un point 3D : leur taille reste fixe à l'écran quand on
 * zoome, mais un décalage en unités du monde se réduit avec le zoom et les étiquettes finissent
 * par se chevaucher. Les décalages sont donc en pixels (transform CSS), comme leur taille.
 * Le point 3D est le bord de la grille ; « center » centre l'étiquette sur ce point, le
 * transform la pousse ensuite hors de la grille.
 */
const GAP = 10

/** Graduation de l'axe X : sous le bord avant de la grille. */
const xTickStyle: CSSProperties = {
  ...labelStyle,
  color: '#fa5252',
  display: 'inline-block',
  transform: `translateY(0px)`
}

/** Graduation de l'axe Y : à gauche du bord, alignée à droite contre la grille. */
const yTickStyle: CSSProperties = {
  ...labelStyle,
  color: '#40c057',
  display: 'inline-block',
  transform: `translateX(calc(-50% - ${GAP}px))`
}

/** Graduation de l'axe Y en vue de côté (YZ) : centrée sur le point, comme celles de X. */
const yTickSideStyle: CSSProperties = {
  ...labelStyle,
  color: '#40c057',
  display: 'inline-block'
}

/** Origine commune aux deux axes : en blanc, en diagonale hors du coin de la grille. */
const originStyle: CSSProperties = {
  ...labelStyle,
  color: '#ffffff',
  display: 'inline-block',
  transform: `translate(-${GAP}px, ${GAP}px)`
}

type Xyz = [number, number, number]

/**
 * Nom d'axe (« X (mm) ») posé au-delà de l'extrémité de son axe, dans le prolongement des
 * graduations : la direction est celle que l'axe a à l'écran, relue à chaque image. Un décalage
 * fixe (haut, droite…) n'est juste que pour un angle de vue ; quand on fait pivoter la vue,
 * le nom resterait à côté de l'axe au lieu de le prolonger.
 */
function AxisName({ text, color, end, before, gap }: {
  text: string
  color: string
  end: Xyz
  /** Un point de l'axe en retrait de l'extrémité : donne le sens de l'axe à l'écran */
  before: Xyz
  /** Distance (px) entre l'extrémité de l'axe et le bord du nom */
  gap: number
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const { camera, size } = useThree()
  const tip = useMemo(() => new THREE.Vector3(), [])
  const tail = useMemo(() => new THREE.Vector3(), [])

  useFrame(() => {
    const el = ref.current
    if (!el) return
    tip.set(...end).project(camera)
    tail.set(...before).project(camera)
    const dx = ((tip.x - tail.x) * size.width) / 2
    const dy = (-(tip.y - tail.y) * size.height) / 2
    const length = Math.hypot(dx, dy)
    // Axe vu par le bout : pas de direction à l'écran, le nom reste à droite
    const [ux, uy] = length > 0.5 ? [dx / length, dy / length] : [1, 0]
    // Le bord du nom est à la distance « gap » de l'extrémité, quelle que soit la direction
    const distance = Math.abs(ux) * (el.offsetWidth / 2) + Math.abs(uy) * (el.offsetHeight / 2) + gap
    el.style.transform = `translate(${ux * distance}px, ${uy * distance}px)`
  })

  return (
    <Html position={end} center zIndexRange={[1, 0]}>
      <span ref={ref} style={{ ...axisStyle(color), display: 'inline-block' }}>
        {text}
      </span>
    </Html>
  )
}

export function WorkAreaGrid({ bbox, sideView = null }: Props) {
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

  // Hauteur des graduations : le plan de la grille, ou le zéro pièce en vue de côté
  const tickY = sideView ? 0 : yOffset
  const showX = sideView !== 'yz'
  const showY = sideView !== 'xz'

  return (
    <group>
      <gridHelper
        args={[gridSize, gridSize / 10, 0x373a40, 0x2c2e33]}
        position={[gridSize / 2, yOffset, -gridSize / 2]}
      />

      {/* X axis labels (along front edge, CNC Y = 0) */}
      {showX &&
        labelValues
          .filter((v) => sideView || v > 0)
          .map((v) => (
            <Html key={`x-${v}`} position={[v, tickY, 0]} center zIndexRange={[1, 0]}>
              <span style={xTickStyle}>{v}</span>
            </Html>
          ))}

      {/* Origine : un seul « 0 » blanc, en vue de côté c'est la graduation de l'axe visible qui le porte */}
      {!sideView && (
        <Html position={[0, yOffset, 0]} center zIndexRange={[1, 0]}>
          <span style={originStyle}>0</span>
        </Html>
      )}

      {/* Y axis labels (along left edge, CNC X = 0). En vue XZ l'axe Y part vers le fond de
          l'écran : ses graduations s'empileraient, on ne les affiche pas. */}
      {showY &&
        labelValues
          .filter((v) => sideView || v > 0)
          .map((v) => (
            <Html key={`y-${v}`} position={[0, tickY, -v]} center zIndexRange={[1, 0]}>
              <span style={sideView ? yTickSideStyle : yTickStyle}>{v}</span>
            </Html>
          ))}

      {/* Axis name + unit : à droite de la dernière graduation de l'axe visible */}
      {showX && (
        <AxisName
          text={`X (${units})`}
          color="#fa5252"
          end={[gridSize, tickY, 0]}
          before={[gridSize * 0.8, tickY, 0]}
          gap={GAP * 2 + 6}
        />
      )}
      {showY && (
        <AxisName
          text={`Y (${units})`}
          color="#40c057"
          end={[0, tickY, -gridSize]}
          before={[0, tickY, -gridSize * 0.8]}
          gap={GAP * 2 + 6}
        />
      )}
    </group>
  )
}
