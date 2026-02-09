import { useLayoutEffect, useRef } from 'react'

export interface AnimationFrameData {
  time: number
  delta: number
}

export default function useAnimationFrame(cb: (time: AnimationFrameData) => void): void {
  if (typeof performance === 'undefined' || typeof window === 'undefined') {
    return
  }

  const cbRef = useRef<(x: AnimationFrameData) => void>(cb)
  const frameRef = useRef<number | undefined>(undefined)
  const initRef = useRef(performance.now())
  const lastRef = useRef(performance.now())

  cbRef.current = cb

  const animate = (now: number) => {
    const delta = (now - lastRef.current) / 1000
    const time = (now - initRef.current) / 1000

    cbRef.current({ time, delta })
    lastRef.current = now
    frameRef.current = requestAnimationFrame(animate)
  }

  useLayoutEffect(() => {
    frameRef.current = requestAnimationFrame(animate)

    return () => {
      if (frameRef.current !== undefined) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [])
}
