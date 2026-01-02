import { useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { AppProvider } from '@solana/connector/react'
import { getDefaultConfig } from '@solana/connector/headless'
import './styles/global.css'
import './styles/LiveGames.css'

const RPC_URL = (import.meta as any).env?.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'

const connectorConfig = getDefaultConfig({
  appName: 'Gamba SDK Basic Example',
  autoConnect: true,
  clusters: [
    { id: 'solana:mainnet' as const, label: 'Mainnet', url: RPC_URL },
    { id: 'solana:devnet' as const, label: 'Devnet', url: 'https://api.devnet.solana.com' },
  ],
})

createRoot(document.getElementById('root')!).render(
  <AppProvider connectorConfig={connectorConfig}>
    <App />
  </AppProvider>
)
