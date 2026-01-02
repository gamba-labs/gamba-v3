import React, { useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './ui/App'
import { RpcProvider } from './providers/RpcContext'
import { TokenProvider } from './providers/TokenContext'
import { AppProvider, getDefaultConfig } from '@solana/connector'
import './ui/styles/global.css'

const DEFAULT_RPC = (import.meta as any).env?.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'

function Providers({ children }: { children: React.ReactNode }) {
  const connectorConfig = useMemo(() => {
    return getDefaultConfig({
      appName: 'Gamba Platform',
      appUrl: 'http://localhost:5174',
      autoConnect: true,
      network: 'mainnet-beta',
      clusters: [
        {
          id: 'solana:mainnet-beta',
          label: 'Mainnet Beta',
          url: DEFAULT_RPC,
        },
        {
          id: 'solana:devnet',
          label: 'Devnet',
          url: 'https://api.devnet.solana.com',
        },
      ],
    })
  }, [])

  return (
    <AppProvider connectorConfig={connectorConfig}>
      <RpcProvider>
        <TokenProvider>
          {children}
        </TokenProvider>
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
