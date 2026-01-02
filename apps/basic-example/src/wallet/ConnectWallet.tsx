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
      <div className="grid gap-8">
        <div className="muted">Connected</div>
        <code style={{ 
          display: 'block',
          padding: '8px', 
          background: '#f5f5f5',
          fontSize: 11,
          wordBreak: 'break-all'
        }}>
          {account}
        </code>
        <button onClick={disconnectWallet}>
          Disconnect
        </button>
      </div>
    )
  }

  if (!connectors.length) {
    return (
      <div className="grid gap-8" style={{ textAlign: 'center' }}>
        <div className="muted">No wallets detected</div>
        <div style={{ fontSize: 13 }}>
          Install a Solana wallet extension
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-8">
      <div className="muted">Select wallet</div>
      {connectors.map((connector) => (
        <button
          key={connector.id}
          onClick={() => connectWallet(connector.id)}
          disabled={isConnecting || !connector.ready}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            width: '100%',
            textAlign: 'left',
          }}
        >
          {connector.icon && (
            <img 
              src={connector.icon} 
              alt="" 
              style={{ width: 20, height: 20 }} 
            />
          )}
          <span style={{ flex: 1, fontWeight: 500 }}>
            {connector.name}
          </span>
          {isConnecting && (
            <span className="muted">…</span>
          )}
        </button>
      ))}
    </div>
  )
}
