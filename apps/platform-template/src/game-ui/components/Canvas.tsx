import React from 'react'
import useAnimationFrame, { type AnimationFrameData } from '../hooks/useAnimationFrame'

export interface CanvasContext {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  size: { width: number; height: number }
}

export interface CanvasProps extends React.InputHTMLAttributes<HTMLCanvasElement> {
  zIndex?: number
  render: (context: CanvasContext, time: AnimationFrameData) => void
}

export const GambaCanvas = React.forwardRef<HTMLCanvasElement, CanvasProps>(function Canvas(props, forwardRef) {
  const { render, zIndex = 0, style, ...rest } = props
  const wrapperRef = React.useRef<HTMLDivElement>(null)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)

  React.useImperativeHandle(forwardRef, () => canvasRef.current as HTMLCanvasElement)

  useAnimationFrame((time) => {
    if (!canvasRef.current || !wrapperRef.current) return

    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return

    ctx.save()
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    render(
      {
        canvas: canvasRef.current,
        ctx,
        size: {
          width: wrapperRef.current.clientWidth,
          height: wrapperRef.current.clientHeight,
        },
      },
      time,
    )

    ctx.restore()
  })

  React.useLayoutEffect(() => {
    let timeoutId: number

    const resize = () => {
      if (!canvasRef.current || !wrapperRef.current) return
      canvasRef.current.width = wrapperRef.current.clientWidth * window.devicePixelRatio
      canvasRef.current.height = wrapperRef.current.clientHeight * window.devicePixelRatio
    }

    const observer = new ResizeObserver(resize)
    if (wrapperRef.current) observer.observe(wrapperRef.current)

    const onResize = () => {
      window.clearTimeout(timeoutId)
      timeoutId = window.setTimeout(resize, 250)
    }

    window.addEventListener('resize', onResize)
    resize()

    return () => {
      window.removeEventListener('resize', onResize)
      observer.disconnect()
      window.clearTimeout(timeoutId)
    }
  }, [])

  return (
    <div
      ref={wrapperRef}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
        zIndex,
      }}
    >
      <canvas {...rest} style={{ width: '100%', height: '100%', ...style }} ref={canvasRef} />
    </div>
  )
})
