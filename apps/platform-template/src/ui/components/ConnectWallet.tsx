import React from 'react'
import { useWallets, useDisconnect } from '@wallet-standard/react'
import { useWalletCtx } from '../../providers/WalletContext'
import { ConnectModal } from './ConnectModal'
import styled from 'styled-components'
import { useRpc } from '../../providers/RpcContext'

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
  const { account, connectedWallet, setConnectedWallet } = useWalletCtx()
  const wallets = useWallets()
  const active = React.useMemo(
    () => wallets.find((w) => w.name === connectedWallet!.wallet.name),
    [wallets, connectedWallet]
  )
  const [isDisconnecting, disconnect] = useDisconnect(active || (connectedWallet!.wallet as any))
  const short = `${account!.address.slice(0, 4)}…${account!.address.slice(-4)}`
  const [open, setOpen] = React.useState(false)
  const { rpcUrl, setRpcUrl } = useRpc()
  const onDisconnect = async () => {
    try {
      await disconnect()
    } finally {
      setConnectedWallet(null)
    }
  }
  return (
    <div style={{ position: 'relative' }}>
      <Btn onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open}>
        {short}
      </Btn>
      {open && (
        <div style={{ position: 'absolute', right: 0, marginTop: 6, background: 'var(--bg)', color: 'var(--fg)', border: '1px solid rgba(125,125,140,0.35)', borderRadius: 8, minWidth: 240, padding: 8 }}>
          <div style={{ display: 'grid', gap: 8 }}>
            <div>
              <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>RPC URL</div>
              <input
                value={rpcUrl}
                onChange={(e) => setRpcUrl(e.target.value)}
                style={{ width: '100%', padding: '6px 8px', background: 'transparent', color: 'inherit', border: '1px solid rgba(125,125,140,0.35)', borderRadius: 6 }}
              />
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <button style={{ flex: 1 }} onClick={() => setRpcUrl('https://api.mainnet-beta.solana.com')}>Mainnet</button>
                <button style={{ flex: 1 }} onClick={() => setRpcUrl('https://api.devnet.solana.com')}>Devnet</button>
              </div>
            </div>
            <hr style={{ border: 'none', borderTop: '1px solid rgba(125,125,140,0.25)', margin: '4px 0' }} />
            <button style={{ width: '100%', padding: '8px 10px', background: 'transparent', color: 'inherit', border: 'none', textAlign: 'left', cursor: 'pointer' }} onClick={onDisconnect} disabled={isDisconnecting}>Disconnect</button>
          </div>
        </div>
      )}
    </div>
  )
}

export function ConnectWallet() {
  const { isConnected, account } = useWalletCtx()
  const [show, setShow] = React.useState(false)
  if (isConnected && account) return <ConnectedSummary />
  return (
    <>
      <Btn onClick={() => setShow(true)}>Connect</Btn>
      <ConnectModal open={show} onClose={() => setShow(false)} />
    </>
  )
}


