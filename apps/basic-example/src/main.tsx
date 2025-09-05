import React from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { WalletProvider } from './wallet/WalletContext'
import { RpcProvider } from './rpc/RpcContext'
import './styles/global.css'

const root = createRoot(document.getElementById('root')!)
root.render(
  <RpcProvider>
    <WalletProvider>
      <App />
    </WalletProvider>
  </RpcProvider>
)


