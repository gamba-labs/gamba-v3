import React from 'react'
import { createSolanaRpc } from '@solana/kit'

type RpcContextType = {
  rpcUrl: string
  setRpcUrl: (url: string) => void
  rpc: ReturnType<typeof createSolanaRpc>
}

const RpcContext = React.createContext<RpcContextType | undefined>(undefined)

const DEFAULT_URL = (import.meta as any).env?.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'

export function RpcProvider({ children }: { children: React.ReactNode }) {
  const [rpcUrl, setRpcUrlState] = React.useState<string>(() => {
    return localStorage.getItem('rpcUrl') || DEFAULT_URL
  })

  const setRpcUrl = React.useCallback((url: string) => {
    setRpcUrlState(url)
    try { localStorage.setItem('rpcUrl', url) } catch {}
  }, [])

  const rpc = React.useMemo(() => createSolanaRpc(rpcUrl), [rpcUrl])

  const value = React.useMemo(() => ({ rpcUrl, setRpcUrl, rpc }), [rpcUrl, setRpcUrl, rpc])

  return <RpcContext.Provider value={value}>{children}</RpcContext.Provider>
}

export function useRpc() {
  const ctx = React.useContext(RpcContext)
  if (!ctx) throw new Error('useRpc must be used within RpcProvider')
  return ctx
}


