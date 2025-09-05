import React from 'react'
import { GamesList } from './game'
import { RecentGamesList } from './recentgames'
import { ConnectWallet } from './wallet/ConnectWallet'
import { useWalletCtx } from './wallet/WalletContext'
import { Instructions } from './instructions/Instructions'
import { useRpc } from './rpc/RpcContext'

export function App() {
  const { account, isConnected } = useWalletCtx()
  const { rpcUrl, setRpcUrl } = useRpc()
  const walletLabel = isConnected && account ? `${account.address.slice(0,4)}…${account.address.slice(-4)}` : 'Connect'
  const [rpcOpen, setRpcOpen] = React.useState(false)
  const [walletOpen, setWalletOpen] = React.useState(false)
  

  return (
    <div>
      <div className="topbar">
        <div className={`dropdown ${rpcOpen ? 'open' : ''}`}>
          <button onClick={() => { setRpcOpen(!rpcOpen); setWalletOpen(false) }}>RPC ▾</button>
          <div className="dropdown-menu panel">
            <div className="muted">RPC URL</div>
            <input style={{ width: '100%' }} value={rpcUrl} onChange={(e) => setRpcUrl(e.target.value)} />
          </div>
        </div>
        <div className={`dropdown ${walletOpen ? 'open' : ''}`}>
          <button onClick={() => { setWalletOpen(!walletOpen); setRpcOpen(false) }}>{walletLabel} ▾</button>
          <div className="dropdown-menu panel">
            <ConnectWallet />
          </div>
        </div>
      </div>
      <div className="container">
        <h1>Gamba SDK Basic Example</h1>
        <div className="muted" style={{ marginBottom: 12 }}>
          {isConnected ? `Connected: ${account?.address}` : 'Not connected'}
        </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
        <div>
          <GamesList />
        </div>
        <div>
          <RecentGamesList />
        </div>
      </div>

      <div style={{ marginTop: 24, display: 'grid', gap: 16 }}>
        <Instructions />
      </div>
      </div>
    </div>
  )
}


