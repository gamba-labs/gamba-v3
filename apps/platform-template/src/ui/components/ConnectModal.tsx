import React from 'react'
import styled from 'styled-components'
import { useConnector } from '@solana/connector'
import { Modal } from './Modal'

const List = styled.div`
  display: grid;
  gap: 10px;
`

const Item = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: transparent;
  color: inherit;
  border: 1px solid rgba(125,125,140,0.35);
  border-radius: 10px;
  cursor: pointer;
  justify-content: space-between;
`

export function ConnectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { connectors, connectWallet, isConnecting } = useConnector()

  const handleConnect = async (connectorId: any) => {
    try {
      await connectWallet(connectorId)
      onClose()
    } catch (e) {
      console.error('connect failed', e)
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <h3 style={{ marginTop: 0, marginBottom: 12 }}>Connect a wallet</h3>
      {connectors.length === 0 ? (
        <div>No wallets found. Install Phantom or Solflare.</div>
      ) : (
        <List>
          {connectors.map((connector) => (
            <Item 
              key={connector.id} 
              onClick={() => handleConnect(connector.id)} 
              disabled={isConnecting || !connector.ready}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {connector.icon && <img src={connector.icon} alt={connector.name} width={24} height={24} />}
                {connector.name}
              </span>
              <span style={{ opacity: 0.7 }}>
                {isConnecting ? 'Connecting…' : connector.ready ? 'Connect' : 'Not installed'}
              </span>
            </Item>
          ))}
        </List>
      )}
    </Modal>
  )
}
