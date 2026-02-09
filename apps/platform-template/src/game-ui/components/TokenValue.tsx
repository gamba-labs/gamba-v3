import React from 'react'
import { TOKENS } from '../../config/constants'
import { useCurrentToken } from '../hooks/useCurrentToken'

export interface TokenValueProps {
  mint?: string
  amount: number | bigint
  suffix?: string
  exact?: boolean
}

function toDisplayNumber(value: number | bigint): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }

  const max = BigInt(Number.MAX_SAFE_INTEGER)
  if (value > max) return Number.MAX_SAFE_INTEGER
  if (value < -max) return Number.MIN_SAFE_INTEGER
  return Number(value)
}

export function TokenValue(props: TokenValueProps) {
  const currentToken = useCurrentToken()
  const mint = props.mint ?? currentToken.mint
  const token = TOKENS.find((entry) => String(entry.mint) === String(mint))

  const decimals = token?.decimals ?? currentToken.decimals
  const symbol = token?.ticker ?? currentToken.symbol
  const suffix = props.suffix ?? symbol
  const tokenAmount = toDisplayNumber(props.amount) / Math.pow(10, decimals)

  const displayedAmount = (() => {
    if (!props.exact) {
      if (tokenAmount >= 1e9) {
        return (tokenAmount / 1e9).toLocaleString(undefined, { maximumFractionDigits: 1 }) + 'B'
      }
      if (tokenAmount >= 1e6) {
        return (tokenAmount / 1e6).toLocaleString(undefined, { maximumFractionDigits: 1 }) + 'M'
      }
      if (tokenAmount > 1000) {
        return (tokenAmount / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 }) + 'K'
      }
    }

    return tokenAmount.toLocaleString(undefined, {
      maximumFractionDigits: Math.floor(tokenAmount) > 100 ? 1 : 4,
    })
  })()

  return (
    <>
      {displayedAmount} {suffix}
    </>
  )
}
