import { useTokenMeta } from '@/hooks'
import BigDecimal from 'js-big-decimal'
import React from 'react'

export interface TokenValueProps {
  mint: string
  amount: number | bigint
  suffix?: string
  exact?: boolean
  dollar?: boolean
  compact?: boolean
  maximumFractionDigits?: number
  minimumFractionDigits?: number
}

const bigIntToFloat = (big: BigInt | number, decimals: number) => {
  const bd = new BigDecimal(String(big)).divide(new BigDecimal(10 ** decimals))
  return parseFloat(bd.getValue())
}

export function TokenValue2(props: TokenValueProps) {
  const token = useTokenMeta(props.mint)
  const suffix = props.suffix ?? token.symbol
  const tokenAmount = bigIntToFloat(props.amount, token.decimals)
  const displayFiat = props.dollar
  const amount = displayFiat ? token.usdPrice * tokenAmount : tokenAmount
  const shouldCompact = props.compact ?? !props.exact
  const maximumFractionDigits = props.maximumFractionDigits ?? (Math.floor(Math.abs(amount)) > 100 ? 1 : 5)

  const displayedAmount = (
    () => {
      if (shouldCompact) {
        if (amount >= 1e9) {
          return (amount / 1e9).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + 'B'
        }
        if (amount >= 1e6) {
          return (amount / 1e6).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + 'M'
        }
        if (amount >= 1e3) {
          return (amount / 1e3).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + 'K'
        }
      }
      return amount.toLocaleString(undefined, {
        maximumFractionDigits,
        ...(props.minimumFractionDigits !== undefined ? { minimumFractionDigits: props.minimumFractionDigits } : {}),
      })
    }
  )()

  return (
    <>
      {displayFiat ? (
        <>
          ${displayedAmount}
        </>
      ) : (
        <>
          {displayedAmount} {suffix}
        </>
      )}
    </>
  )
}
