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
  const walletRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    if (!walletOpen) return
    const handleClick = (event: MouseEvent) => {
      if (!walletRef.current) return
      if (!walletRef.current.contains(event.target as Node)) {
        setWalletOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [walletOpen])

  return (
    <div className="container">
      <header className="header">
        <div>
          <h1>Gamba SDK Basic Example</h1>
          <div className="muted">
            {isConnected ? `Connected: ${account}` : 'Not connected'}
          </div>
        </div>
        <div className="wallet" ref={walletRef}>
          <button
            className="wallet-button"
            onClick={() => setWalletOpen((open) => !open)}
          >
            <span className="wallet-name">{walletLabel}</span>
            <span className="wallet-meta">▼</span>
          </button>
          {walletOpen && (
            <div className="wallet-dropdown panel panel-tight wallet-panel">
              <ConnectWallet />
            </div>
          )}
        </div>
      </header>

      <div className="section-grid">
        <section className="section">
          <h2>Live Games</h2>
          <GamesList />
        </section>

        <section className="section">
          <h2>Recent Games</h2>
          <RecentGamesList />
        </section>
      </div>

      <section className="section">
        <h2>Instructions</h2>
        <Instructions />
      </section>
    </div>
  )
}
