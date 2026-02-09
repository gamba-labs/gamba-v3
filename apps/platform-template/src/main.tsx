import { createRoot } from 'react-dom/client'
import { App } from './ui/App'
import { TokenProvider } from './providers/TokenContext'
import { ConnectWalletModalProvider } from './providers/ConnectWalletModalContext'
import { AppProvider, getDefaultConfig } from '@solana/connector'
import { GambaReactProvider } from '@gamba/react'
import { BrowserRouter } from 'react-router-dom'
import './ui/styles/global.css'

const RPC_URL = (import.meta as any).env?.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'

const connectorConfig = getDefaultConfig({
  appName: 'Gamba Platform',
  autoConnect: true,
  clusters: [
    { id: 'solana:mainnet' as const, label: 'Mainnet', url: RPC_URL },
    { id: 'solana:devnet' as const, label: 'Devnet', url: 'https://api.devnet.solana.com' },
  ],
})

createRoot(document.getElementById('root')!).render(
  <GambaReactProvider rpcUrl={RPC_URL}>
    <AppProvider connectorConfig={connectorConfig}>
      <BrowserRouter>
        <TokenProvider>
          <ConnectWalletModalProvider>
            <App />
          </ConnectWalletModalProvider>
        </TokenProvider>
      </BrowserRouter>
    </AppProvider>
  </GambaReactProvider>
)
