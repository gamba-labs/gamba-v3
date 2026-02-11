import React from 'react'
import { useConnector } from '@solana/connector'
import { pdas } from '@gamba/core'
import { createSolanaRpcSubscriptions } from '@solana/kit'
import type { Address } from '@solana/kit'
import { TOKENS } from '../config/constants'
import { useGambaRpc } from '@gamba/react'

type Balances = Record<string, string>
type RawBalances = Record<string, bigint>

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function formatBalanceDisplay(rawAmount: bigint, decimals: number): string {
  const amount = Number(rawAmount) / Math.pow(10, decimals)
  if (!Number.isFinite(amount) || amount <= 0) return '0'

  if (amount >= 1) {
    return amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  }
  if (amount >= 0.01) {
    return amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 4 })
  }
  if (amount >= 0.0001) {
    return amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 6 })
  }
  return '<0.0001'
}

export function useBalance() {
  const { rpc, wsUrl } = useGambaRpc()
  const { account, isConnected } = useConnector()
  const [balances, setBalances] = React.useState<Balances>({})
  const [rawBalances, setRawBalances] = React.useState<RawBalances>({})
  const [loading, setLoading] = React.useState(true)

  const userAddress = React.useMemo(() => {
    if (!account) return null
    return String((account as any).address ?? account) as Address
  }, [account])

  const fetchBalances = React.useCallback(async () => {
    if (!userAddress) {
      setBalances({})
      setRawBalances({})
      setLoading(false)
      return
    }

    try {
      const results = await Promise.all(
        TOKENS.map(async (cfg) => {
          try {
            const isSol = cfg.id === 'sol' || String(cfg.mint) === 'So11111111111111111111111111111111111111112'

            if (isSol) {
              const res = await rpc.getBalance(userAddress).send()
              const lamports = BigInt((res as any)?.value ?? res ?? 0)
              const ui = formatBalanceDisplay(lamports, 9)
              return [cfg.id, ui, lamports] as const
            }

            const ata = await pdas.deriveAta(userAddress, cfg.mint as Address)
            const res = await rpc.getTokenAccountBalance(ata).send()
            const raw = BigInt((res?.value?.amount ?? '0') as string)
            const ui = formatBalanceDisplay(raw, cfg.decimals ?? 0)
            return [cfg.id, ui, raw] as const
          } catch {
            return [cfg.id, '0', 0n] as const
          }
        }),
      )

      setBalances(Object.fromEntries(results.map(([id, ui]) => [id, ui])))
      setRawBalances(Object.fromEntries(results.map(([id, _ui, raw]) => [id, raw])))
    } catch {
      setBalances({})
      setRawBalances({})
    } finally {
      setLoading(false)
    }
  }, [rpc, userAddress])

  React.useEffect(() => {
    fetchBalances()
  }, [fetchBalances])

  React.useEffect(() => {
    if (!userAddress || !isConnected) return

    const rpcSubs = createSolanaRpcSubscriptions(wsUrl)
    const abortController = new AbortController()
    let closed = false

    const subscribeToAccounts = async () => {
      ;(async () => {
        try {
          const notifications = await rpcSubs
            .accountNotifications(userAddress, { commitment: 'confirmed', encoding: 'base64' })
            .subscribe({ abortSignal: abortController.signal })

            for await (const notification of notifications) {
              if (closed) break
              try {
                const lamports = BigInt((notification.value as any)?.lamports ?? 0)
                const ui = formatBalanceDisplay(lamports, 9)
                setBalances((prev) => ({ ...prev, sol: ui }))
                setRawBalances((prev) => ({ ...prev, sol: lamports }))
              } catch {}
            }
          } catch {}
      })()

      for (const cfg of TOKENS) {
        if (cfg.id === 'sol' || String(cfg.mint) === 'So11111111111111111111111111111111111111112') continue

        ;(async () => {
          try {
            const ata = await pdas.deriveAta(userAddress, cfg.mint as Address)
            const notifications = await rpcSubs
              .accountNotifications(ata, { commitment: 'confirmed', encoding: 'base64' })
              .subscribe({ abortSignal: abortController.signal })

            for await (const notification of notifications) {
              if (closed) break
              try {
                const data = (notification.value as any)?.data
                if (!data) continue
                const [b64] = Array.isArray(data) ? data : [data]
                if (typeof b64 !== 'string') continue
                const bytes = base64ToBytes(b64)

                if (bytes.length >= 72) {
                  const amountBytes = bytes.slice(64, 72)
                  const amount = amountBytes.reduce((acc, byte, i) => acc + BigInt(byte) * (256n ** BigInt(i)), 0n)
                  const decimals = cfg.decimals ?? 0
                  const ui = formatBalanceDisplay(amount, decimals)
                  setBalances((prev) => ({ ...prev, [cfg.id]: ui }))
                  setRawBalances((prev) => ({ ...prev, [cfg.id]: amount }))
                }
              } catch {}
            }
          } catch {}
        })()
      }
    }

    subscribeToAccounts()

    return () => {
      closed = true
      abortController.abort()
    }
  }, [wsUrl, userAddress, isConnected])

  const refetch = React.useCallback(() => {
    setLoading(true)
    fetchBalances()
  }, [fetchBalances])

  return { balances, rawBalances, loading, refetch }
}
