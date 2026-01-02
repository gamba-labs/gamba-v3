import React from 'react'
import { useRpc } from '../providers/RpcContext'
import { useConnector } from '@solana/connector'
import { instructions } from '@gamba/sdk'
import { useToken } from '../providers/TokenContext'
import type { Address } from '@solana/kit'
import { useSendSmartTransaction } from './useSendSmartTransaction'

type PlayResult = { signature: string } | { error: unknown }
type PlayOptions = {
  wager?: number | bigint
  clientSeed?: string
  metadata?: string
  creatorFeeBps?: number
  jackpotFeeBps?: number
}

export function useGambaPlay() {
  const { rpc } = useRpc()
  const { isConnected } = useConnector()
  const { selectedPool } = useToken()
  const { send, signer } = useSendSmartTransaction()

  const play = React.useCallback(async (bet: number[] | string, options?: PlayOptions): Promise<PlayResult> => {
    try {
      if (!isConnected || !signer) throw new Error('Wallet not connected')
      if (!selectedPool?.poolAddress || !selectedPool.underlyingTokenMint) throw new Error('Select a token/pool')

      const betArray = Array.isArray(bet)
        ? bet
        : String(bet).split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n))
      // Convert [2,0] -> [20000,0] (bps with two decimals: 10000 = 1x)
      const betBps = betArray.map((x) => Math.round(Number(x) * 10000))

      const ix = await instructions.singleplayer.buildPlayGameInstruction({
        user: signer as unknown as any,
        pool: selectedPool.poolAddress as Address,
        wager: options?.wager ?? 0,
        bet: betBps,
        clientSeed: options?.clientSeed ?? 'seed',
        metadata: options?.metadata ?? '{}',
        creatorFeeBps: options?.creatorFeeBps ?? 0,
        jackpotFeeBps: options?.jackpotFeeBps ?? 0,
        rpc,
      })

      const signature = await send([ix])
      return { signature }
    } catch (e) {
      return { error: e }
    }
  }, [rpc, isConnected, selectedPool, send, signer])

  return { play }
}
