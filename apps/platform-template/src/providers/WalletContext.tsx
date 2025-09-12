import React from 'react'
import type { ReactNode } from 'react'
import type { UiWalletAccount, UiWallet } from '@wallet-standard/react'

type ConnectedWallet = { account: UiWalletAccount; wallet: UiWallet }

type WalletContextType = {
  account: UiWalletAccount | null
  wallet: UiWallet | null
  connectedWallet: ConnectedWallet | null
  setConnectedWallet: (wallet: ConnectedWallet | null) => void
  isConnected: boolean
}

const WalletContext = React.createContext<WalletContextType | undefined>(undefined)

export function WalletProvider({ children }: { children: ReactNode }) {
  const [connectedWallet, setConnectedWallet] = React.useState<ConnectedWallet | null>(null)

  const value = React.useMemo<WalletContextType>(() => ({
    account: connectedWallet?.account ?? null,
    wallet: connectedWallet?.wallet ?? null,
    connectedWallet,
    setConnectedWallet,
    isConnected: !!connectedWallet,
  }), [connectedWallet])

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

export function useWalletCtx() {
  const ctx = React.useContext(WalletContext)
  if (!ctx) throw new Error('useWalletCtx must be used within WalletProvider')
  return ctx
}


