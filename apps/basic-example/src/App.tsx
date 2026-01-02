import React from 'react'
import { GamesList } from './LiveGames'
import { RecentGamesList } from './RecentGames'
import { ConnectWallet } from './wallet/ConnectWallet'
import { useConnector } from '@solana/connector'
import { Instructions } from './instructions/Instructions'

export function App() {
  const { account, isConnected } = useConnector()
  const walletLabel = isConnected && account ? `${account.slice(0,4)}…${account.slice(-4)}` : 'Connect'
  const [walletOpen, setWalletOpen] = React.useState(false)

  return (
    <div>
      <div className="topbar">
        <div className={`dropdown ${walletOpen ? 'open' : ''}`}>
          <button onClick={() => setWalletOpen(!walletOpen)}>{walletLabel} ▾</button>
          <div className="dropdown-menu panel">
            <ConnectWallet />
          </div>
        </div>
      </div>
      <div className="container">
        <h1>Gamba SDK Basic Example</h1>
        <div className="muted" style={{ marginBottom: 12 }}>
          {isConnected ? `Connected: ${account}` : 'Not connected'}
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
