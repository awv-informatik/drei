import * as React from 'react'
import * as THREE from 'three'
import { ThreeEvent, useThree } from '@react-three/fiber'
import { Line } from '../Line'
import { context } from './context'

const vec1 = new THREE.Vector3()
const vec2 = new THREE.Vector3()

export const calculateOffset = (
  clickPoint: THREE.Vector3,
  normal: THREE.Vector3,
  rayStart: THREE.Vector3,
  rayDir: THREE.Vector3
) => {
  const e1 = normal.dot(normal)
  const e2 = normal.dot(clickPoint) - normal.dot(rayStart)
  const e3 = normal.dot(rayDir)

  if (e3 === 0) {
    return -e2 / e1
  }

  vec1
    .copy(rayDir)
    .multiplyScalar(e1 / e3)
    .sub(normal)
  vec2
    .copy(rayDir)
    .multiplyScalar(e2 / e3)
    .add(rayStart)
    .sub(clickPoint)

  const offset = -vec1.dot(vec2) / vec1.dot(vec1)
  return offset
}

const upV = new THREE.Vector3(0, 1, 0)
const offsetMatrix = new THREE.Matrix4()

export const AxisArrow: React.FC<{ direction: THREE.Vector3; axis: 0 | 1 | 2 }> = ({ direction, axis }) => {
  const {
    translation,
    translationLimits,
    depthTest,
    scale,
    lineWidth,
    fixed,
    axisColors,
    hoveredColor,
    opacity,
    onDragStart,
    onDrag,
    onDragEnd,
    userData,
  } = React.useContext(context)

  // @ts-expect-error new in @react-three/fiber@7.0.5
  const camControls = useThree((state) => state.controls) as { enabled: boolean }
  const objRef = React.useRef<THREE.Group>(null!)
  const clickInfo = React.useRef<{ clickPoint: THREE.Vector3; dir: THREE.Vector3 } | null>(null)
  const offset0 = React.useRef<number>(0)
  const [isHovered, setIsHovered] = React.useState(false)

  const onPointerDown = React.useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      const rotation = new THREE.Matrix4().extractRotation(objRef.current.matrixWorld)
      const clickPoint = e.point.clone()
      const dir = direction.clone().applyMatrix4(rotation).normalize()
      clickInfo.current = { clickPoint, dir }
      offset0.current = translation.current[axis]
      onDragStart()
      camControls && (camControls.enabled = false)
      // @ts-ignore - setPointerCapture is not in the type definition
      e.target.setPointerCapture(e.pointerId)
    },
    [direction, camControls, onDragStart, translation, axis]
  )

  const onPointerMove = React.useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      if (!isHovered) setIsHovered(true)

      if (clickInfo.current) {
        const { clickPoint, dir } = clickInfo.current
        const [min, max] = translationLimits?.[axis] || [undefined, undefined]

        let offset = calculateOffset(clickPoint, dir, e.ray.origin, e.ray.direction)
        if (min !== undefined) {
          offset = Math.max(offset, min - offset0.current)
        }
        if (max !== undefined) {
          offset = Math.min(offset, max - offset0.current)
        }
        translation.current[axis] = offset0.current + offset
        offsetMatrix.makeTranslation(dir.x * offset, dir.y * offset, dir.z * offset)
        onDrag(offsetMatrix)
      }
    },
    [onDrag, isHovered, translation, translationLimits, axis]
  )

  const onPointerUp = React.useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      clickInfo.current = null
      onDragEnd()
      camControls && (camControls.enabled = true)
      // @ts-ignore - releasePointerCapture & PointerEvent#pointerId is not in the type definition
      e.target.releasePointerCapture(e.pointerId)
    },
    [camControls, onDragEnd]
  )

  const onPointerOut = React.useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    setIsHovered(false)
  }, [])

  const { cylinderLength, coneWidth, coneLength, matrixL } = React.useMemo(() => {
    const coneWidth = fixed ? (lineWidth / scale) * 1.6 : scale / 20
    const coneLength = fixed ? 0.2 : scale / 5
    const cylinderLength = fixed ? 1 - coneLength : scale - coneLength
    const quaternion = new THREE.Quaternion().setFromUnitVectors(upV, direction.clone().normalize())
    const matrixL = new THREE.Matrix4().makeRotationFromQuaternion(quaternion)
    return { cylinderLength, coneWidth, coneLength, matrixL }
  }, [direction, scale, lineWidth, fixed])

  const color_ = isHovered ? hoveredColor : axisColors[axis]

  return (
    <group ref={objRef}>
      <group
        matrix={matrixL}
        matrixAutoUpdate={false}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerOut={onPointerOut}
      >
        <Line
          transparent
          depthTest={depthTest}
          points={[0, 0, 0, 0, cylinderLength, 0] as any}
          lineWidth={lineWidth}
          color={color_ as any}
          opacity={opacity}
          polygonOffset
          renderOrder={1}
          polygonOffsetFactor={-10}
          userData={userData}
        />
        <mesh position={[0, cylinderLength + coneLength / 2.0, 0]} renderOrder={500} userData={userData}>
          <coneGeometry args={[coneWidth, coneLength, 24, 1]} />
          <meshBasicMaterial
            transparent
            depthTest={depthTest}
            color={color_}
            opacity={opacity}
            polygonOffset
            polygonOffsetFactor={-10}
          />
        </mesh>
      </group>
    </group>
  )
}
