import React from 'react'
import { TOKENS } from '../../config/constants'
import { useBalance } from '../../hooks/useBalance'
import { useToken } from '../../providers/TokenContext'

export type UiBalance = {
  balance: number
  bonusBalance: number
}

function toSafeNumber(value: bigint): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) return Number.MAX_SAFE_INTEGER
  if (value < BigInt(Number.MIN_SAFE_INTEGER)) return Number.MIN_SAFE_INTEGER
  return Number(value)
}

export function useUserBalance(mint?: string): UiBalance {
  const { rawBalances } = useBalance()
  const { selected } = useToken()

  return React.useMemo(() => {
    const tokenId = mint
      ? TOKENS.find((token) => String(token.mint) === String(mint))?.id
      : selected.id

    if (!tokenId) return { balance: 0, bonusBalance: 0 }

    const raw = rawBalances[tokenId] ?? 0n

    return {
      balance: toSafeNumber(raw),
      bonusBalance: 0,
    }
  }, [mint, rawBalances, selected.id])
}

export const useTokenBalance = useUserBalance
