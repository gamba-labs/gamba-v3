import React from 'react'
import { useConnector } from '@solana/connector'
import { ConnectModal } from './ConnectModal'
import { MenuInfo, MenuItem, MenuPanel, MenuWrapper, UiButton } from './primitives'

function ConnectedSummary() {
  const { account, disconnectWallet } = useConnector()
  const [open, setOpen] = React.useState(false)
  const [isDisconnecting, setIsDisconnecting] = React.useState(false)
  const rootRef = React.useRef<HTMLDivElement>(null)

  const address = account ? String((account as any).address ?? account) : ''
  const short = address ? `${address.slice(0, 4)}...${address.slice(-4)}` : ''

  React.useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current) return
      if (rootRef.current.contains(event.target as Node)) return
      setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  const handleDisconnect = async () => {
    setIsDisconnecting(true)
    try {
      await disconnectWallet()
      setOpen(false)
    } finally {
      setIsDisconnecting(false)
    }
  }

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <UiButton onClick={() => setOpen((value) => !value)} aria-haspopup="menu" aria-expanded={open}>
        {short}
      </UiButton>
      {open && (
        <MenuWrapper>
          <MenuPanel>
            <MenuInfo>{address}</MenuInfo>
            <MenuItem as="button" onClick={handleDisconnect} disabled={isDisconnecting}>
              {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
            </MenuItem>
          </MenuPanel>
        </MenuWrapper>
      )}
    </div>
  )
}

export function ConnectWallet() {
  const { isConnected, isConnecting } = useConnector()
  const [show, setShow] = React.useState(false)

  if (isConnected) return <ConnectedSummary />

  return (
    <>
      <UiButton onClick={() => setShow(true)}>{isConnecting ? 'Connecting' : 'Connect'}</UiButton>
      <ConnectModal open={show} onClose={() => setShow(false)} />
    </>
  )
}
