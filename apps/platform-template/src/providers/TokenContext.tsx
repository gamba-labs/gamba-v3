import React from 'react'
import { core, pdas } from '@gamba/core'
import type { Address } from '@solana/kit'
import bs58 from 'bs58'
import { TOKENS, POOLS, DEFAULT_POOL_ID, DEFAULT_POOL_AUTHORITY, type PoolConfig } from '../config/constants'
import { useGambaRpc } from '@gamba/react'

export type TokenOption = {
  id: string
  ticker: string
  mint: Address
}

export type PoolOption = {
  id: string
  tokenId: string
  label?: string
}

export type SelectedPoolInfo = {
  id: string
  label?: string
  token: TokenOption
  poolAddress: Address | null
  underlyingTokenMint: Address | null
  poolAuthority: Address | null
}

type TokenContextType = {
  tokens: TokenOption[]
  pools: PoolOption[]
  selected: TokenOption
  selectedPoolOption: PoolOption
  setSelectedPool: (poolId: string) => void
  setSelected: (t: TokenOption) => void
  selectedPool: SelectedPoolInfo | null
}

const TokenContext = React.createContext<TokenContextType | undefined>(undefined)
const LAST_SELECTED_POOL_KEY = 'gamba-v3:last-selected-pool'

const FALLBACK_TOKEN: TokenOption = {
  id: TOKENS[0]?.id ?? 'token',
  ticker: TOKENS[0]?.ticker ?? 'TOKEN',
  mint: (TOKENS[0]?.mint ?? '11111111111111111111111111111111') as Address,
}

const FALLBACK_POOL: PoolOption = {
  id: POOLS[0]?.id ?? 'pool',
  tokenId: POOLS[0]?.tokenId ?? FALLBACK_TOKEN.id,
  label: POOLS[0]?.label,
}

export function TokenProvider({ children }: { children: React.ReactNode }) {
  const { rpc } = useGambaRpc()
  const tokens: TokenOption[] = React.useMemo(
    () => TOKENS.map((token) => ({ id: token.id, ticker: token.ticker, mint: token.mint })),
    [],
  )
  const pools: PoolOption[] = React.useMemo(
    () => POOLS.map((pool) => ({ id: pool.id, tokenId: pool.tokenId, label: pool.label })),
    [],
  )
  const tokenById = React.useMemo(() => new Map(TOKENS.map((token) => [token.id, token])), [])
  const poolById = React.useMemo(() => new Map(POOLS.map((pool) => [pool.id, pool])), [])
  const defaultPoolId = React.useMemo(() => {
    if (poolById.has(DEFAULT_POOL_ID)) return DEFAULT_POOL_ID
    return pools[0]?.id ?? FALLBACK_POOL.id
  }, [poolById, pools])

  const [selectedPoolId, setSelectedPoolId] = React.useState<string>(() => {
    if (typeof window === 'undefined') return DEFAULT_POOL_ID
    try {
      const stored = window.localStorage.getItem(LAST_SELECTED_POOL_KEY)
      if (stored && POOLS.some((pool) => pool.id === stored)) return stored
    } catch {}
    return DEFAULT_POOL_ID
  })
  const [selectedPool, setSelectedPool] = React.useState<SelectedPoolInfo | null>(null)

  const selectedPoolConfig = React.useMemo<PoolConfig | null>(() => {
    return poolById.get(selectedPoolId) ?? poolById.get(defaultPoolId) ?? null
  }, [poolById, selectedPoolId, defaultPoolId])

  const selectedPoolOption = React.useMemo<PoolOption>(() => {
    if (!selectedPoolConfig) return FALLBACK_POOL
    return {
      id: selectedPoolConfig.id,
      tokenId: selectedPoolConfig.tokenId,
      label: selectedPoolConfig.label,
    }
  }, [selectedPoolConfig])

  const selected = React.useMemo<TokenOption>(() => {
    const token = tokenById.get(selectedPoolOption.tokenId)
    if (!token) return tokens[0] ?? FALLBACK_TOKEN
    return { id: token.id, ticker: token.ticker, mint: token.mint }
  }, [tokenById, selectedPoolOption.tokenId, tokens])

  React.useEffect(() => {
    if (!poolById.has(selectedPoolId)) {
      setSelectedPoolId(defaultPoolId)
    }
  }, [poolById, selectedPoolId, defaultPoolId])

  React.useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(LAST_SELECTED_POOL_KEY, selectedPoolOption.id)
    } catch {}
  }, [selectedPoolOption.id])

  const setSelectedPoolById = React.useCallback(
    (poolId: string) => {
      if (!poolById.has(poolId)) return
      setSelectedPoolId(poolId)
    },
    [poolById],
  )

  // Backward-compatible token setter: select the first pool for that token.
  const setSelected = React.useCallback((token: TokenOption) => {
    const firstPool = POOLS.find((pool) => pool.tokenId === token.id)
    if (firstPool) setSelectedPoolId(firstPool.id)
  }, [])

  React.useEffect(() => {
    let cancelled = false

    ;(async () => {
      const poolConfig = selectedPoolConfig
      if (!poolConfig) {
        setSelectedPool(null)
        return
      }

      const tokenConfig = tokenById.get(poolConfig.tokenId)
      if (!tokenConfig) {
        setSelectedPool(null)
        return
      }

      const token: TokenOption = {
        id: tokenConfig.id,
        ticker: tokenConfig.ticker,
        mint: tokenConfig.mint,
      }

      const baseInfo = {
        id: poolConfig.id,
        label: poolConfig.label,
        token,
        underlyingTokenMint: tokenConfig.mint,
      }

      // Priority: explicit poolAddress -> derive from authority (defaulting to DEFAULT_POOL_AUTHORITY) -> fallback: scan on-chain by mint/authority
      try {
        const authority = (poolConfig.poolAuthority ?? DEFAULT_POOL_AUTHORITY) as Address

        if (poolConfig.poolAddress) {
          if (!cancelled) {
            setSelectedPool({
              ...baseInfo,
              poolAddress: poolConfig.poolAddress as Address,
              poolAuthority: authority,
            })
          }
          return
        }

        try {
          const pool = await pdas.derivePoolPda(tokenConfig.mint as Address, authority)
          if (!cancelled) {
            setSelectedPool({
              ...baseInfo,
              poolAddress: pool,
              poolAuthority: authority,
            })
          }
          return
        } catch {}

        // Fallback: scan all pools and pick the first matching mint/authority.
        const disc = core.getPoolDiscriminatorBytes()
        const discB58 = bs58.encode(new Uint8Array(disc))
        const res: any[] = await rpc.getProgramAccounts(core.GAMBA_PROGRAM_ADDRESS, {
          filters: [
            { memcmp: { offset: 0n, bytes: discB58 as any, encoding: 'base58' } },
          ],
          encoding: 'base64',
        }).send()

        let match: Address | null = null
        for (const item of res) {
          const [b64] = item.account.data as [string, string]
          const bin = atob(b64)
          const bytes = new Uint8Array(bin.length)
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
          const data = core.getPoolDecoder().decode(bytes) as any
          if (String(data.underlyingTokenMint) !== String(tokenConfig.mint)) continue
          if (poolConfig.poolAuthority && String(data.poolAuthority) !== String(poolConfig.poolAuthority)) continue
          if (poolConfig.poolAddress && String(item.pubkey) !== String(poolConfig.poolAddress)) continue
          if (String(data.poolAuthority) === String(authority) || !poolConfig.poolAuthority) {
            match = String(item.pubkey) as Address
            break
          }
        }

        if (!cancelled) {
          setSelectedPool({
            ...baseInfo,
            poolAddress: match,
            poolAuthority: authority,
          })
        }
      } catch {
        if (!cancelled) {
          setSelectedPool({
            ...baseInfo,
            poolAddress: null,
            poolAuthority: (poolConfig.poolAuthority ?? null) as Address | null,
          })
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [rpc, selectedPoolConfig, tokenById])

  const value = React.useMemo<TokenContextType>(
    () => ({
      tokens,
      pools,
      selected,
      selectedPoolOption,
      setSelectedPool: setSelectedPoolById,
      setSelected,
      selectedPool,
    }),
    [tokens, pools, selected, selectedPoolOption, setSelectedPoolById, setSelected, selectedPool],
  )

  return <TokenContext.Provider value={value}>{children}</TokenContext.Provider>
}

export function useToken() {
  const ctx = React.useContext(TokenContext)
  if (!ctx) throw new Error('useToken must be used within TokenProvider')
  return ctx
}
