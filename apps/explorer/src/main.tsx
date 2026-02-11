import '@radix-ui/themes/styles.css'
import './styles.css'

import * as Toast from '@radix-ui/react-toast'
import { GambaReactProvider } from '@gamba/react'
import { AppProvider, getDefaultConfig } from '@solana/connector'
import { Theme } from '@radix-ui/themes'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { SWRConfig } from 'swr'
import { App } from './App'

const RPC_URL = (import.meta as any).env?.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'

const connectorConfig = getDefaultConfig({
  appName: 'Gamba Explorer',
  autoConnect: true,
  clusters: [
    { id: 'solana:mainnet' as const, label: 'Mainnet', url: RPC_URL },
    { id: 'solana:devnet' as const, label: 'Devnet', url: 'https://api.devnet.solana.com' },
  ],
})

const root = ReactDOM.createRoot(document.getElementById('root')!)

function Root() {
  return (
    <Theme appearance="dark" accentColor="iris" radius="large" panelBackground="translucent">
      <BrowserRouter>
        <GambaReactProvider rpcUrl={RPC_URL}>
          <AppProvider connectorConfig={connectorConfig}>
            <SWRConfig
              value={{
                dedupingInterval: 5_000,
                focusThrottleInterval: 30_000,
                revalidateOnFocus: true,
                refreshWhenHidden: false,
                refreshWhenOffline: false,
              }}
            >
              <Toast.Provider swipeDirection="right">
                <App />
              </Toast.Provider>
            </SWRConfig>
          </AppProvider>
        </GambaReactProvider>
      </BrowserRouter>
    </Theme>
  )
}

root.render(<Root />)
