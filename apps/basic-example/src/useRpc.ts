import { useMemo } from 'react'
import { createSolanaRpc } from '@solana/kit'

const RPC_URL = (import.meta as any).env?.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'

export function useRpc() {
  const rpc = useMemo(() => createSolanaRpc(RPC_URL), [])
  return { rpc, rpcUrl: RPC_URL }
}

