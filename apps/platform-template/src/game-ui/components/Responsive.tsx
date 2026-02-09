import React from 'react'
import styled from 'styled-components'

const Responsive = styled.div`
  justify-content: center;
  align-items: center;
  display: flex;
  width: 100%;
  flex-direction: column;
  max-width: 100vw;
  height: 100%;
  left: 0;
  top: 0;
`

type Props = React.PropsWithChildren<React.HTMLAttributes<HTMLDivElement>> & {
  maxScale?: number
  overlay?: boolean
}

export function ResponsiveSize({ children, maxScale = 1, overlay: _overlay, ...props }: Props) {
  const wrapperRef = React.useRef<HTMLDivElement>(null)
  const innerRef = React.useRef<HTMLDivElement>(null)
  const contentRef = React.useRef<HTMLDivElement>(null)

  React.useLayoutEffect(() => {
    let timeout: number

    const resize = () => {
      if (!wrapperRef.current || !innerRef.current || !contentRef.current) {
        return
      }

      const ww = wrapperRef.current.clientWidth / (contentRef.current.scrollWidth + 40)
      const hh = wrapperRef.current.clientHeight / (contentRef.current.clientHeight + 80)
      const zoom = Math.min(maxScale, ww, hh)
      innerRef.current.style.transform = `scale(${zoom})`
    }

    const observer = new ResizeObserver(resize)
    if (wrapperRef.current) observer.observe(wrapperRef.current)

    const onResize = () => {
      window.clearTimeout(timeout)
      timeout = window.setTimeout(resize, 250)
    }

    window.addEventListener('resize', onResize)
    resize()

    return () => {
      window.removeEventListener('resize', onResize)
      observer.disconnect()
      window.clearTimeout(timeout)
    }
  }, [maxScale])

  return (
    <Responsive ref={wrapperRef} {...props}>
      <div ref={innerRef}>
        <div ref={contentRef}>{children}</div>
      </div>
    </Responsive>
  )
}
