import React from 'react'
import ReactDOM from 'react-dom'

type PortalStore = {
  refs: Record<string, React.MutableRefObject<HTMLElement | null> | null>
  setRef: (target: string, ref: React.MutableRefObject<HTMLElement | null> | null) => void
}

const PortalContext = React.createContext<PortalStore | null>(null)

export function PortalProvider(props: React.PropsWithChildren) {
  const [refs, setRefs] = React.useState<Record<string, React.MutableRefObject<HTMLElement | null> | null>>({})

  const setRef = React.useCallback((target: string, ref: React.MutableRefObject<HTMLElement | null> | null) => {
    setRefs((prev) => {
      if (prev[target] === ref) return prev
      return { ...prev, [target]: ref }
    })
  }, [])

  const context = React.useMemo<PortalStore>(
    () => ({
      refs,
      setRef,
    }),
    [refs, setRef],
  )

  return <PortalContext.Provider value={context}>{props.children}</PortalContext.Provider>
}

export function Portal(props: React.PropsWithChildren<{ target: string }>) {
  const context = React.useContext(PortalContext)
  if (!context) {
    throw new Error('Portal must be used within PortalProvider')
  }
  const targetRef = context.refs[props.target]
  const node = targetRef?.current ?? null

  if (!node) return null
  return ReactDOM.createPortal(props.children, node)
}

export function PortalTarget(props: React.PropsWithChildren<{ target: string }>) {
  const context = React.useContext(PortalContext)
  if (!context) {
    throw new Error('PortalTarget must be used within PortalProvider')
  }
  const { setRef } = context

  const ref = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    setRef(props.target, ref as React.MutableRefObject<HTMLElement | null>)
    return () => setRef(props.target, null)
  }, [props.target, setRef])

  return (
    <div style={{ display: 'contents' }} ref={ref}>
      {props.children}
    </div>
  )
}
