import React from 'react'
import styled from 'styled-components'
import { useConnector } from '@solana/connector'
import { Modal } from './Modal'

const Title = styled.h1`
  margin: 0;
  padding: 8px 0 18px;
  text-align: center;
  font-size: 24px;
`

const List = styled.div`
  display: grid;
  gap: 8px;
`

const Item = styled.button`
  all: unset;
  box-sizing: border-box;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px;
  border-radius: 10px;
  background: #0f121b;
  color: #fff;
  border: 1px solid transparent;
  transition: background 0.15s ease, border-color 0.15s ease;

  &:hover {
    background: #131724;
    border-color: rgba(149, 100, 255, 0.35);
  }

  &:disabled {
    cursor: default;
    opacity: 0.6;
    border-color: transparent;
  }
`

const WalletIdentity = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 10px;
`

const Status = styled.span`
  opacity: 0.72;
  font-size: 12px;
`

const Empty = styled.p`
  margin: 0;
  opacity: 0.8;
  text-align: center;
`

export function ConnectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { connectors, connectWallet, isConnecting } = useConnector()

  const handleConnect = async (connectorId: any) => {
    try {
      await connectWallet(connectorId)
      onClose()
    } catch (error) {
      console.error('connect failed', error)
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <Title>Connect Wallet</Title>
      {connectors.length === 0 ? (
        <Empty>No wallets found. Install Phantom or Solflare.</Empty>
      ) : (
        <List>
          {connectors.map((connector) => (
            <Item key={connector.id} onClick={() => handleConnect(connector.id)} disabled={isConnecting || !connector.ready}>
              <WalletIdentity>
                {connector.icon && <img src={connector.icon} alt={connector.name} width={22} height={22} />}
                <span>{connector.name}</span>
              </WalletIdentity>
              <Status>{isConnecting ? 'Connecting...' : connector.ready ? 'Connect' : 'Not installed'}</Status>
            </Item>
          ))}
        </List>
      )}
    </Modal>
  )
}
