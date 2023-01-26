import { EventManager, ReactThreeFiber, useFrame, useThree } from '@react-three/fiber'
import * as React from 'react'
import type { Camera, Event } from 'three'
import { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

export type OrbitControlsChangeEvent = Event & {
  target: EventTarget & { object: Camera }
}

export type OrbitControlsProps = Omit<
  ReactThreeFiber.Overwrite<
    ReactThreeFiber.Object3DNode<OrbitControlsImpl, typeof OrbitControlsImpl>,
    {
      camera?: Camera
      domElement?: HTMLElement
      enableDamping?: boolean
      makeDefault?: boolean
      onChange?: (e?: OrbitControlsChangeEvent) => void
      onEnd?: (e?: Event) => void
      onStart?: (e?: Event) => void
      regress?: boolean
      target?: ReactThreeFiber.Vector3
      // Wether to enable events during orbit controls interaction
      events?: boolean
    }
  >,
  'ref'
>

export const OrbitControls = React.forwardRef<OrbitControlsImpl, OrbitControlsProps>(
  (
    {
      makeDefault,
      events: enableEvents,
      camera,
      regress,
      domElement,
      enableDamping = true,
      onChange,
      onStart,
      onEnd,
      ...restProps
    },
    ref
  ) => {
    const invalidate = useThree((state) => state.invalidate)
    const defaultCamera = useThree((state) => state.camera)
    const gl = useThree((state) => state.gl)
    const events = useThree((state) => state.events) as EventManager<HTMLElement>
    const setEvents = useThree((state) => state.setEvents)
    const set = useThree((state) => state.set)
    const get = useThree((state) => state.get)
    const performance = useThree((state) => state.performance)
    const explCamera = camera || defaultCamera
    const explDomElement = (domElement || events.connected || gl.domElement) as HTMLElement
    const controls = React.useMemo(() => new OrbitControlsImpl(explCamera), [explCamera])

    useFrame(() => {
      if (controls.enabled) controls.update()
    }, -1)

    React.useEffect(() => {
      controls.connect(explDomElement)
      return () => void controls.dispose()
    }, [explDomElement, regress, controls, invalidate])

    React.useEffect(() => {
      if (enableEvents) {
        setEvents({ enabled: true })
      }

      const callback = (e: OrbitControlsChangeEvent) => {
        invalidate()
        if (regress) performance.regress()
        if (onChange) onChange(e)
      }

      const onStartCb = (e: Event) => {
        if (onStart) onStart(e)
        if (!enableEvents) setEvents({ enabled: false })
      }

      const onEndCb = (e: Event) => {
        if (onEnd) onEnd(e)
        if (!enableEvents) setEvents({ enabled: true })
      }

      controls.addEventListener('change', callback)
      controls.addEventListener('start', onStartCb)
      controls.addEventListener('end', onEndCb)

      return () => {
        controls.removeEventListener('start', onStartCb)
        controls.removeEventListener('end', onEndCb)
        controls.removeEventListener('change', callback)
      }
    }, [onChange, onStart, onEnd, controls, invalidate, enableEvents, setEvents])

    React.useEffect(() => {
      if (makeDefault) {
        const old = get().controls
        set({ controls })
        return () => set({ controls: old })
      }
    }, [makeDefault, controls])

    return <primitive ref={ref} object={controls} enableDamping={enableDamping} {...restProps} />
  }
)
