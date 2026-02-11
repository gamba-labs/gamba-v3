import React from 'react'
import { TOKENS, tokenImageCandidates } from '../../config/constants'
import { useToken } from '../../providers/TokenContext'

export type UiTokenMeta = {
  mint: string
  name: string
  symbol: string
  decimals: number
  baseWager: number
  image: string
}

export function useCurrentToken(): UiTokenMeta {
  const { selected, selectedPool } = useToken()

  return React.useMemo(() => {
    const cfg = TOKENS.find((token) => token.id === selected.id)

    return {
      mint: String(selectedPool?.underlyingTokenMint ?? selected.mint ?? cfg?.mint ?? ''),
      name: cfg?.ticker ?? selected.ticker,
      symbol: cfg?.ticker ?? selected.ticker,
      decimals: cfg?.decimals ?? 0,
      baseWager: Math.max(1, Math.round(cfg?.baseWager ?? 1)),
      image: cfg ? (tokenImageCandidates(cfg)[0] ?? '/gamba.svg') : '/gamba.svg',
    }
  }, [selected.id, selected.ticker, selected.mint, selectedPool?.underlyingTokenMint])
}
