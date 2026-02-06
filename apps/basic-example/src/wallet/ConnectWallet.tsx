import React from 'react'
import { useConnector } from '@solana/connector'

export function ConnectWallet() {
  const { 
    connectors, 
    connectWallet, 
    disconnectWallet, 
    isConnected, 
    isConnecting,
    account 
  } = useConnector()

  if (isConnected && account) {
    return (
      <div className="wallet-stack">
        <div className="wallet-status-line">
          <span className="dot dot-ok" />
          <span className="muted">Connected</span>
        </div>
        <code className="wallet-address">{account}</code>
        <button className="wallet-button secondary" onClick={disconnectWallet}>
          Disconnect
        </button>
      </div>
    )
  }

  if (!connectors.length) {
    return (
      <div className="wallet-empty">
        <div className="muted">No wallets detected</div>
        <div className="wallet-help">Install a Solana wallet extension</div>
      </div>
    )
  }

  return (
    <div className="wallet-stack">
      <div className="muted">Select wallet</div>
      {connectors.map((connector) => (
        <button
          key={connector.id}
          onClick={() => connectWallet(connector.id)}
          disabled={isConnecting || !connector.ready}
          className="wallet-button"
        >
          {connector.icon && (
            <img src={connector.icon} alt="" className="wallet-icon" />
          )}
          <span className="wallet-name">{connector.name}</span>
          <span className="wallet-meta">
            {!connector.ready ? 'Not installed' : isConnecting ? 'Connecting…' : 'Connect'}
          </span>
        </button>
      ))}
    </div>
  )
}
