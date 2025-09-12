import React from 'react'
import { useRpc } from '../providers/RpcContext'
import { useWalletCtx } from '../providers/WalletContext'
import { pdas, instructions } from '@gamba/sdk'

type PlayResult = { signature: string } | { error: unknown }

export function useGambaPlay() {
  const { rpc } = useRpc()
  const { account } = useWalletCtx()

  const play = React.useCallback(async (): Promise<PlayResult> => {
    try {
      if (!account) throw new Error('Wallet not connected')
      // Placeholder: construct and send a minimal instruction; to be replaced with game-specific logic
      // This is a stub so consumers can wire UI quickly
      const dummySig = 'TODO'
      return { signature: dummySig }
    } catch (e) {
      return { error: e }
    }
  }, [rpc, account])

  return { play }
}


