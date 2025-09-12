import React from 'react'
import styled from 'styled-components'
import { useWallets, useConnect, type UiWallet } from '@wallet-standard/react'
import { Modal } from './Modal'
import { useWalletCtx } from '../../providers/WalletContext'

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

function WalletItem({ wallet, onDone }: { wallet: UiWallet; onDone: () => void }) {
  const { setConnectedWallet } = useWalletCtx()
  const [isConnecting, connect] = useConnect(wallet)
  const onClick = async () => {
    try {
      const accounts = await connect()
      const first = accounts?.[0]
      if (first) {
        setConnectedWallet({ account: first, wallet })
        onDone()
      }
    } catch (e) {
      console.error('connect failed', e)
    }
  }
  return (
    <Item onClick={onClick} disabled={isConnecting}>
      <span>{wallet.name}</span>
      <span style={{ opacity: 0.7 }}>{isConnecting ? 'Connecting…' : 'Connect'}</span>
    </Item>
  )
}

export function ConnectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const wallets = useWallets()
  const solanaWallets = wallets.filter((w) => w.chains.some((c) => c.startsWith('solana:')))
  return (
    <Modal open={open} onClose={onClose}>
      <h3 style={{ marginTop: 0, marginBottom: 12 }}>Connect a wallet</h3>
      {!solanaWallets.length ? (
        <div>No wallets found. Install Phantom or Solflare.</div>
      ) : (
        <List>
          {solanaWallets.map((w) => (
            <WalletItem key={w.name} wallet={w} onDone={onClose} />
          ))}
        </List>
      )}
    </Modal>
  )
}


