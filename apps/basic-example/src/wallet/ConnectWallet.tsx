import React from 'react'
import { useWallets, useConnect, useDisconnect, type UiWallet } from '@wallet-standard/react'
import { useWalletCtx } from './WalletContext'

function SelectedConnector({ wallet }: { wallet: UiWallet }) {
  const { setConnectedWallet } = useWalletCtx()
  const [isConnecting, connect] = useConnect(wallet)

  const onConnect = async () => {
    try {
      const accounts = await connect()
      const first = accounts[0]
      if (first) setConnectedWallet({ account: first, wallet })
    } catch (e) {
      console.error('connect failed', e)
    }
  }

  return (
    <div style={{ display: 'inline-flex', gap: 8 }}>
      <button onClick={onConnect} disabled={isConnecting}>
        {isConnecting ? 'Connecting…' : `Connect ${wallet.name}`}
      </button>
    </div>
  )
}

function ConnectedSummary() {
  const { account, connectedWallet, setConnectedWallet } = useWalletCtx()
  const wallets = useWallets()
  const active = React.useMemo(
    () => wallets.find((w) => w.name === connectedWallet!.wallet.name),
    [wallets, connectedWallet]
  )
  const [isDisconnecting, disconnect] = useDisconnect(active || (connectedWallet!.wallet as any))
  const short = `${account!.address.slice(0, 4)}…${account!.address.slice(-4)}`
  const onDisconnect = async () => {
    try {
      await disconnect()
    } finally {
      setConnectedWallet(null)
    }
  }
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div className="muted">Connected</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{short}</div>
      <button onClick={onDisconnect} disabled={isDisconnecting}>Disconnect</button>
    </div>
  )
}

function ConnectOptions() {
  const wallets = useWallets()
  const solanaWallets = wallets.filter((w) => w.chains.some((c) => c.startsWith('solana:')))
  if (!solanaWallets.length) return <div>No wallets found. Install Phantom/Solflare.</div>
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div className="muted">Select a wallet to connect</div>
      {solanaWallets.map((w) => (
        <SelectedConnector key={w.name} wallet={w} />
      ))}
    </div>
  )
}

export function ConnectWallet() {
  const { isConnected, account } = useWalletCtx()
  if (isConnected && account) return <ConnectedSummary />
  return <ConnectOptions />
}


