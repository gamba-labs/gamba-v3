import React from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './ui/App'
import { RpcProvider } from './providers/RpcContext'
import { WalletProvider } from './providers/WalletContext'
import { TokenProvider } from './providers/TokenContext'
import './ui/styles/global.css'

const root = createRoot(document.getElementById('root')!)
root.render(
  <RpcProvider>
    <WalletProvider>
      <TokenProvider>
        <App />
      </TokenProvider>
    </WalletProvider>
  </RpcProvider>
)


