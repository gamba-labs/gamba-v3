import React from 'react'
import { core, pdas } from '@gamba/core'
import type { Address } from '@solana/kit'
import { useGambaRpc } from '@gamba/react'
import { useToken } from '../../providers/TokenContext'
import { BPS_PER_WHOLE } from '../types'

export type UiPoolState = {
  publicKey: string
  token: string
  liquidity: bigint
  minWager: number
  maxPayout: number
  gambaFee: number
  poolFee: number
  jackpotBalance: number
  authority: string
}

function toSafeNumber(value: bigint | number | undefined | null): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value !== 'bigint') return 0
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) return Number.MAX_SAFE_INTEGER
  if (value < BigInt(Number.MIN_SAFE_INTEGER)) return Number.MIN_SAFE_INTEGER
  return Number(value)
}

export function useCurrentPool(): UiPoolState {
  const { rpc } = useGambaRpc()
  const { selectedPool } = useToken()

  const [state, setState] = React.useState<UiPoolState>(() => ({
    publicKey: String(selectedPool?.poolAddress ?? ''),
    token: String(selectedPool?.underlyingTokenMint ?? ''),
    liquidity: 0n,
    minWager: 0,
    maxPayout: 0,
    gambaFee: 0,
    poolFee: 0,
    jackpotBalance: 0,
    authority: String(selectedPool?.poolAddress ?? ''),
  }))

  React.useEffect(() => {
    let cancelled = false

    const poolAddress = selectedPool?.poolAddress
    const tokenMint = selectedPool?.underlyingTokenMint

    if (!poolAddress || !tokenMint) {
      setState((prev) => ({
        ...prev,
        publicKey: String(poolAddress ?? ''),
        token: String(tokenMint ?? ''),
        liquidity: 0n,
        minWager: 0,
        maxPayout: 0,
        gambaFee: 0,
        poolFee: 0,
        jackpotBalance: 0,
      }))
      return
    }

    ;(async () => {
      try {
        const [pool, gambaStateAddress] = await Promise.all([
          core.fetchMaybePool(rpc, poolAddress as Address),
          pdas.deriveGambaStatePda(),
        ])

        const gambaState = await core.fetchMaybeGambaState(rpc, gambaStateAddress)

        if (!pool.exists || !pool.data) {
          if (!cancelled) {
            setState({
              publicKey: String(poolAddress),
              token: String(tokenMint),
              liquidity: 0n,
              minWager: 0,
              maxPayout: 0,
              gambaFee: 0,
              poolFee: 0,
              jackpotBalance: 0,
              authority: String(poolAddress),
            })
          }
          return
        }

        const poolData = pool.data as any
        const gambaData = gambaState.exists ? (gambaState.data as any) : null

        const liquidity = BigInt(poolData.liquidityCheckpoint ?? 0)
        const customGambaFeeBps = toSafeNumber(poolData.customGambaFeeBps)
        const customPoolFeeBps = toSafeNumber(poolData.customPoolFeeBps)

        const gambaFeeBps = customGambaFeeBps || toSafeNumber(gambaData?.gambaFeeBps)
        const poolFeeBps = customPoolFeeBps || toSafeNumber(gambaData?.defaultPoolFee)

        const maxPayoutBps =
          toSafeNumber(poolData.customMaxPayoutBps) || toSafeNumber(gambaData?.maxPayoutBps)

        const maxPayout = toSafeNumber((liquidity * BigInt(maxPayoutBps)) / BigInt(BPS_PER_WHOLE))

        let jackpotBalance = 0
        try {
          const jackpotAddress = await pdas.derivePoolJackpotTokenAccountPda(poolAddress as Address)
          const jackpot = await rpc.getTokenAccountBalance(jackpotAddress).send()
          jackpotBalance = toSafeNumber(BigInt(jackpot?.value?.amount ?? '0'))
        } catch {
          jackpotBalance = 0
        }

        if (!cancelled) {
          setState({
            publicKey: String(poolAddress),
            token: String(tokenMint),
            liquidity,
            minWager: toSafeNumber(poolData.minWager),
            maxPayout,
            gambaFee: gambaFeeBps / BPS_PER_WHOLE,
            poolFee: poolFeeBps / BPS_PER_WHOLE,
            jackpotBalance,
            authority: String(poolData.poolAuthority ?? poolAddress),
          })
        }
      } catch {
        if (!cancelled) {
          setState({
            publicKey: String(poolAddress),
            token: String(tokenMint),
            liquidity: 0n,
            minWager: 0,
            maxPayout: 0,
            gambaFee: 0,
            poolFee: 0,
            jackpotBalance: 0,
            authority: String(poolAddress),
          })
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [rpc, selectedPool?.poolAddress, selectedPool?.underlyingTokenMint])

  return state
}
