import React from 'react'
import styled from 'styled-components'
import { useConnector } from '@solana/connector'
import { Modal } from './Modal'

const INITIAL_VISIBLE_CONNECTORS = 5
const LOAD_MORE_STEP = 5

const Title = styled.h1`
  margin: 0;
  padding: 4px 0 6px;
  text-align: center;
  font-size: 24px;
  font-weight: 700;
`

const Subtitle = styled.p`
  margin: 0 0 16px;
  text-align: center;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.72);
`

const List = styled.div`
  display: grid;
  gap: 10px;
`

const Item = styled.button`
  all: unset;
  box-sizing: border-box;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 11px 12px;
  border-radius: 12px;
  background: #0e131d;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: background 0.15s ease, border-color 0.15s ease;

  &:hover {
    background: #141b28;
    border-color: rgba(255, 255, 255, 0.2);
  }

  &:disabled {
    cursor: default;
    opacity: 0.56;
  }
`

const IconWrap = styled.span`
  width: 24px;
  height: 24px;
  display: inline-grid;
  place-items: center;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);

  img {
    width: 20px;
    height: 20px;
    border-radius: 999px;
  }
`

const WalletIdentity = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 11px;
  font-weight: 500;
`

const Status = styled.span`
  opacity: 0.82;
  font-size: 11px;
  letter-spacing: 0.01em;
  border-radius: 999px;
  padding: 5px 8px;
  background: rgba(255, 255, 255, 0.08);
`

const Empty = styled.p`
  margin: 8px 0 2px;
  opacity: 0.78;
  text-align: center;
`

const Footer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 12px;
`

const LoadMoreButton = styled.button`
  all: unset;
  box-sizing: border-box;
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
  color: rgba(255, 255, 255, 0.84);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  padding: 8px 12px;
  transition: border-color 0.15s ease, background 0.15s ease;

  &:hover {
    border-color: rgba(255, 255, 255, 0.32);
    background: rgba(255, 255, 255, 0.06);
  }
`

export function ConnectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { connectors, connectWallet, isConnecting } = useConnector()
  const [visibleCount, setVisibleCount] = React.useState(INITIAL_VISIBLE_CONNECTORS)

  const sortedConnectors = React.useMemo(
    () =>
      [...connectors].sort((a, b) => {
        if (a.ready !== b.ready) return Number(b.ready) - Number(a.ready)
        return a.name.localeCompare(b.name)
      }),
    [connectors],
  )

  const visibleConnectors = React.useMemo(() => sortedConnectors.slice(0, visibleCount), [sortedConnectors, visibleCount])
  const hasMore = sortedConnectors.length > visibleCount

  React.useEffect(() => {
    if (!open) return
    setVisibleCount(INITIAL_VISIBLE_CONNECTORS)
  }, [open])

  const handleConnect = async (connectorId: string) => {
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
      <Subtitle>Select a wallet to continue.</Subtitle>
      {sortedConnectors.length === 0 ? (
        <Empty>No wallets found. Install Phantom or Solflare.</Empty>
      ) : (
        <>
          <List>
            {visibleConnectors.map((connector) => (
              <Item
                key={connector.id}
                onClick={() => handleConnect(connector.id)}
                disabled={isConnecting || !connector.ready}
              >
                <WalletIdentity>
                  <IconWrap>
                    {connector.icon && <img src={connector.icon} alt={connector.name} />}
                  </IconWrap>
                  <span>{connector.name}</span>
                </WalletIdentity>
                <Status>{isConnecting ? 'Connecting...' : connector.ready ? 'Connect' : 'Not installed'}</Status>
              </Item>
            ))}
          </List>
          {hasMore && (
            <Footer>
              <LoadMoreButton onClick={() => setVisibleCount((value) => value + LOAD_MORE_STEP)}>
                Load more wallets
              </LoadMoreButton>
            </Footer>
          )}
        </>
      )}
    </Modal>
  )
}
