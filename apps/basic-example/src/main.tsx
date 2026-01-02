import React, { useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { AppProvider } from '@solana/connector/react'
import { getDefaultConfig } from '@solana/connector/headless'
import { RpcProvider } from './rpc/RpcContext'
import './styles/global.css'
import './styles/LiveGames.css'

const DEFAULT_RPC = (import.meta as any).env?.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'

function Providers({ children }: { children: React.ReactNode }) {
  const connectorConfig = useMemo(() => {
    return getDefaultConfig({
      appName: 'Gamba SDK Basic Example',
      autoConnect: true,
      clusters: [
        {
          id: 'solana:mainnet' as const,
          label: 'Mainnet',
          url: DEFAULT_RPC,
        },
        {
          id: 'solana:devnet' as const,
          label: 'Devnet',
          url: 'https://api.devnet.solana.com',
        },
      ],
    })
  }, [])

  return (
    <AppProvider connectorConfig={connectorConfig}>
      <RpcProvider>
        {children}
      </RpcProvider>
    </AppProvider>
  )
}

const root = createRoot(document.getElementById('root')!)
root.render(
  <Providers>
    <App />
  </Providers>
)
