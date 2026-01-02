import React from 'react'
import { useConnector } from '@solana/connector'
import { ConnectModal } from './ConnectModal'
import styled from 'styled-components'

const Btn = styled.button`
  appearance: none;
  border: 1px solid rgba(125,125,140,0.35);
  background: transparent;
  color: inherit;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
`

function ConnectedSummary() {
  const { account, disconnectWallet } = useConnector()
  const [open, setOpen] = React.useState(false)
  const [isDisconnecting, setIsDisconnecting] = React.useState(false)
  
  const address = account ? String((account as any).address ?? account) : ''
  const short = address ? `${address.slice(0, 4)}…${address.slice(-4)}` : ''

  const handleDisconnect = async () => {
    setIsDisconnecting(true)
    try {
      await disconnectWallet()
    } finally {
      setIsDisconnecting(false)
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <Btn onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open}>
        {short}
      </Btn>
      {open && (
        <div style={{ position: 'absolute', right: 0, marginTop: 6, background: 'var(--bg)', color: 'var(--fg)', border: '1px solid rgba(125,125,140,0.35)', borderRadius: 8, minWidth: 180, padding: 8 }}>
          <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 8 }}>{address}</div>
          <button 
            style={{ width: '100%', padding: '8px 10px', background: 'transparent', color: 'inherit', border: '1px solid rgba(125,125,140,0.35)', borderRadius: 6, cursor: 'pointer' }} 
            onClick={handleDisconnect} 
            disabled={isDisconnecting}
          >
            {isDisconnecting ? 'Disconnecting…' : 'Disconnect'}
          </button>
        </div>
      )}
    </div>
  )
}

export function ConnectWallet() {
  const { isConnected } = useConnector()
  const [show, setShow] = React.useState(false)

  if (isConnected) return <ConnectedSummary />
  
  return (
    <>
      <Btn onClick={() => setShow(true)}>Connect</Btn>
      <ConnectModal open={show} onClose={() => setShow(false)} />
    </>
  )
}
