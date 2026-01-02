import React from 'react'
import { useRpc } from '../useRpc'
import { useConnector } from '@solana/connector'
import { pdas } from '@gamba/sdk'
import { createSolanaRpcSubscriptions } from '@solana/kit'
import type { Address } from '@solana/kit'
import { TOKENS } from '../config/constants'

type Balances = Record<string, string>

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export function useBalance() {
  const { rpc, rpcUrl } = useRpc()
  const { account, isConnected } = useConnector()
  const [balances, setBalances] = React.useState<Balances>({})
  const [loading, setLoading] = React.useState(true)

  const userAddress = React.useMemo(() => {
    if (!account) return null
    return String((account as any).address ?? account) as Address
  }, [account])

  // Fetch all balances
  const fetchBalances = React.useCallback(async () => {
    if (!userAddress) {
      setBalances({})
      setLoading(false)
      return
    }

    try {
      const results = await Promise.all(TOKENS.map(async (cfg) => {
        try {
          const isSol = cfg.id === 'sol' || String(cfg.mint) === 'So11111111111111111111111111111111111111112'
          
          if (isSol) {
            const res = await rpc.getBalance(userAddress).send()
            const lamports = BigInt((res as any)?.value ?? res ?? 0)
            const ui = Number(lamports) / 1e9
            return [cfg.id, ui.toFixed(4)] as const
          } else {
            const ata = await pdas.deriveAta(userAddress, cfg.mint as Address)
            const res = await rpc.getTokenAccountBalance(ata).send()
            const uiStr = res?.value?.uiAmountString as string | undefined
            if (uiStr) return [cfg.id, uiStr] as const
            const raw = (res?.value?.amount ?? '0') as string
            const ui = Number(BigInt(raw)) / Math.pow(10, cfg.decimals)
            return [cfg.id, ui.toFixed(4)] as const
          }
        } catch {
          return [cfg.id, '0'] as const
        }
      }))

      setBalances(Object.fromEntries(results))
    } catch {
      setBalances({})
    } finally {
      setLoading(false)
    }
  }, [rpc, userAddress])

  // Initial fetch
  React.useEffect(() => {
    fetchBalances()
  }, [fetchBalances])

  // WebSocket subscription for live updates
  React.useEffect(() => {
    if (!userAddress || !isConnected) return

    const wsUrl = rpcUrl.replace(/^http/i, 'ws')
    const rpcSubs = createSolanaRpcSubscriptions(wsUrl)
    const abortController = new AbortController()
    let closed = false

    const subscribeToAccounts = async () => {
      // Subscribe to SOL balance (user's main account)
      ;(async () => {
        try {
          const notifications = await rpcSubs.accountNotifications(
            userAddress,
            { commitment: 'confirmed', encoding: 'base64' }
          ).subscribe({ abortSignal: abortController.signal })

          for await (const notification of notifications) {
            if (closed) break
            try {
              const lamports = BigInt((notification.value as any)?.lamports ?? 0)
              const ui = Number(lamports) / 1e9
              setBalances(prev => ({ ...prev, sol: ui.toFixed(4) }))
            } catch {}
          }
        } catch {}
      })()

      // Subscribe to each token account
      for (const cfg of TOKENS) {
        if (cfg.id === 'sol' || String(cfg.mint) === 'So11111111111111111111111111111111111111112') continue

        ;(async () => {
          try {
            const ata = await pdas.deriveAta(userAddress, cfg.mint as Address)
            const notifications = await rpcSubs.accountNotifications(
              ata,
              { commitment: 'confirmed', encoding: 'base64' }
            ).subscribe({ abortSignal: abortController.signal })

            for await (const notification of notifications) {
              if (closed) break
              try {
                // Parse token account data to get balance
                // Token account layout: ... amount at offset 64, 8 bytes u64
                const data = (notification.value as any)?.data
                if (!data) continue
                const [b64] = Array.isArray(data) ? data : [data]
                if (typeof b64 !== 'string') continue
                const bytes = base64ToBytes(b64)
                
                // Token account: amount is at byte 64, 8 bytes little-endian u64
                if (bytes.length >= 72) {
                  const amountBytes = bytes.slice(64, 72)
                  const amount = amountBytes.reduce((acc, byte, i) => acc + BigInt(byte) * (256n ** BigInt(i)), 0n)
                  const ui = Number(amount) / Math.pow(10, cfg.decimals)
                  setBalances(prev => ({ ...prev, [cfg.id]: ui.toFixed(4) }))
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
  }, [rpcUrl, userAddress, isConnected])

  // Refetch function for manual refresh
  const refetch = React.useCallback(() => {
    setLoading(true)
    fetchBalances()
  }, [fetchBalances])

  return { balances, loading, refetch }
}

