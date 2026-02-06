import { createContext } from 'react'
import { createSolanaRpc } from '@solana/kit'
import type { GambaReactConfig } from '../types'

export type GambaReactContextValue = {
  rpc: ReturnType<typeof createSolanaRpc>
  rpcUrl: string
  wsUrl: string
  config: GambaReactConfig
}

export const GambaReactContext = createContext<GambaReactContextValue | null>(null)
