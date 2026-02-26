import { Suspense, useRef, useEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, GizmoHelper, PerspectiveCamera, OrthographicCamera } from '@react-three/drei'
import { ToolpathLines } from './ToolpathLines'
import { WorkAreaGrid } from './WorkAreaGrid'
import { ToolPositionMarker } from './ToolPositionMarker'
import { useVisualizationStore } from '../../stores/visualization.store'
import { useMachineStore } from '../../stores/machine.store'
import { useUIStore } from '../../stores/ui.store'
import styles from './VisualizerPanel.module.css'

const INITIAL_CAM_POS: [number, number, number] = [100, 200, 200]
const INITIAL_TARGET: [number, number, number] = [100, 0, -100]
const TOP_VIEW_POS: [number, number, number] = [100, 300, -100]
const SIDE_VIEW_POS: [number, number, number] = [100, 0, 200]

type ViewMode = 'perspective' | 'top' | 'side'

const VIEW_CONFIG: Record<ViewMode, { pos: [number, number, number]; up: [number, number, number] }> = {
  perspective: { pos: INITIAL_CAM_POS, up: [0, 1, 0] },
  top:         { pos: TOP_VIEW_POS,    up: [0, 0, -1] },
  side:        { pos: SIDE_VIEW_POS,   up: [0, 1, 0] },
}

/* ── Custom CNC axes gizmo ────────────────────────────────────── */

const CNC_AXES = [
  { dir: [1, 0, 0] as const, label: 'X', color: '#fa5252', hex: 0xfa5252 },   // CNC X = Three.js +X
  { dir: [0, 0, -1] as const, label: 'Y', color: '#40c057', hex: 0x40c057 },  // CNC Y = Three.js -Z
  { dir: [0, 1, 0] as const, label: 'Z', color: '#339af0', hex: 0x339af0 },   // CNC Z = Three.js +Y
]

function AxisLabel({ text, color, position }: { text: string; color: string; position: [number, number, number] }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, 64, 64)
    ctx.font = 'bold 44px Arial'
    ctx.fillStyle = color
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 32, 32)
    return new THREE.CanvasTexture(canvas)
  }, [text, color])

  return (
    <sprite position={position} scale={[0.4, 0.4, 1]}>
      <spriteMaterial map={texture} transparent depthTest={false} />
    </sprite>
  )
}

function CncAxesGizmo() {
  const arrows = useMemo(
    () =>
      CNC_AXES.map((a) => ({
        dir: new THREE.Vector3(...a.dir),
        origin: new THREE.Vector3(0, 0, 0),
      })),
    []
  )

  return (
    <group scale={40}>
      {CNC_AXES.map((axis, i) => (
        <group key={axis.label}>
          <arrowHelper args={[arrows[i].dir, arrows[i].origin, 1, axis.hex, 0.2, 0.1]} />
          <AxisLabel
            text={axis.label}
            color={axis.color}
            position={[axis.dir[0] * 1.3, axis.dir[1] * 1.3, axis.dir[2] * 1.3]}
          />
        </group>
      ))}
    </group>
  )
}

/* ── Scene background (theme-aware) ────────────────────────────── */

const VIZ_BG = { dark: '#141517', light: '#d2d6da' }

function SceneBackground() {
  const { scene } = useThree()
  const theme = useUIStore((s) => s.theme)

  useEffect(() => {
    scene.background = new THREE.Color(VIZ_BG[theme])
    return () => { scene.background = null }
  }, [theme, scene])

  return null
}

/* ── Scene ─────────────────────────────────────────────────────── */

interface ResetCameraFn {
  (mode: ViewMode): void
}

interface SceneProps {
  viewMode: ViewMode
  resetRef: React.RefObject<ResetCameraFn | null>
}

function Scene({ viewMode, resetRef }: SceneProps) {
  const segments = useVisualizationStore((s) => s.toolpathSegments)
  const bbox = useVisualizationStore((s) => s.boundingBox)
  const executedLineIndex = useVisualizationStore((s) => s.executedLineIndex)
  const wpos = useMachineStore((s) => s.wpos)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const controlsRef = useRef<any>(null)

  const { camera } = useThree()

  const resetCamera = (mode: ViewMode) => {
    const { pos, up } = VIEW_CONFIG[mode]
    camera.position.set(...pos)
    camera.up.set(...up)
    camera.updateProjectionMatrix()
    if (controlsRef.current) {
      controlsRef.current.target.set(...INITIAL_TARGET)
      controlsRef.current.update()
    }
  }

  useEffect(() => {
    resetRef.current = resetCamera
  })

  useEffect(() => {
    resetCamera(viewMode)
  }, [viewMode])

  return (
    <>
      <SceneBackground />
      {viewMode === 'perspective' ? (
        <PerspectiveCamera makeDefault position={INITIAL_CAM_POS} fov={45} up={[0, 1, 0]} />
      ) : (
        <OrthographicCamera
          makeDefault
          position={VIEW_CONFIG[viewMode].pos}
          zoom={2.5}
          up={VIEW_CONFIG[viewMode].up}
        />
      )}
      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.1}
        target={INITIAL_TARGET}
        enableRotate={viewMode === 'perspective'}
      />

      <ambientLight intensity={0.6} />
      <directionalLight position={[50, 100, 50]} intensity={0.4} />

      <WorkAreaGrid bbox={bbox} />

      {/* Axes helper */}
      <group>
        {/* X axis - red */}
        <mesh position={[10, 0, 0]}>
          <boxGeometry args={[20, 0.5, 0.5]} />
          <meshBasicMaterial color="#fa5252" />
        </mesh>
        {/* Y axis - green */}
        <mesh position={[0, 0, -10]}>
          <boxGeometry args={[0.5, 0.5, 20]} />
          <meshBasicMaterial color="#40c057" />
        </mesh>
        {/* Z axis - blue */}
        <mesh position={[0, 10, 0]}>
          <boxGeometry args={[0.5, 20, 0.5]} />
          <meshBasicMaterial color="#339af0" />
        </mesh>
      </group>

      {segments.length > 0 && (
        <ToolpathLines segments={segments} executedIndex={executedLineIndex} />
      )}

      <ToolPositionMarker position={[wpos.x, wpos.z, -wpos.y]} />

      {/* Custom CNC gizmo with correct axis directions */}
      <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
        <CncAxesGizmo />
      </GizmoHelper>
    </>
  )
}

export function VisualizerPanel() {
  const [viewMode, setViewMode] = useState<ViewMode>('perspective')
  const resetRef = useRef<ResetCameraFn | null>(null)

  const handleView = (mode: ViewMode) => {
    setViewMode(mode)
    resetRef.current?.(mode)
  }

  return (
    <div className={styles.container}>
      <Canvas
        gl={{ antialias: true, alpha: false }}
        dpr={window.devicePixelRatio}
      >
        <Suspense fallback={null}>
          <Scene viewMode={viewMode} resetRef={resetRef} />
        </Suspense>
      </Canvas>
      <div className={styles.viewBtns}>
        <button
          className={`${styles.viewBtn} ${viewMode === 'perspective' ? styles.viewBtnActive : ''}`}
          onClick={() => handleView('perspective')}
          title="Vue perspective 3D"
        >
          ⌂ 3D
        </button>
        <button
          className={`${styles.viewBtn} ${viewMode === 'top' ? styles.viewBtnActive : ''}`}
          onClick={() => handleView('top')}
          title="Vue de dessus orthogonale (XY)"
        >
          ⊡ XY
        </button>
        <button
          className={`${styles.viewBtn} ${viewMode === 'side' ? styles.viewBtnActive : ''}`}
          onClick={() => handleView('side')}
          title="Vue de face orthogonale (XZ)"
        >
          ▯ XZ
        </button>
      </div>
    </div>
  )
}
