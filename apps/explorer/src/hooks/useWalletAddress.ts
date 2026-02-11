import { useConnector } from '@solana/connector'
import React from 'react'

export function normalizeAddress(value: unknown): string | null {
  if (!value) return null
  if (typeof value === 'string') return value

  if (typeof value === 'object') {
    const maybeAddress = (value as any).address
    if (typeof maybeAddress === 'string') return maybeAddress
    if (maybeAddress && typeof maybeAddress.toString === 'function') {
      const text = String(maybeAddress)
      if (text) return text
    }

    if (typeof (value as any).toBase58 === 'function') {
      return String((value as any).toBase58())
    }

    if (typeof (value as any).toString === 'function') {
      const text = String(value)
      if (text && text !== '[object Object]') return text
    }
  }

  return null
}

export function useWalletAddress() {
  const { account } = useConnector()
  return React.useMemo(() => normalizeAddress(account), [account])
}
