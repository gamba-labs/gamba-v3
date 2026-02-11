import { TOKEN_OVERRIDES, type TokenOverride } from '@/config/token-overrides'
import { signal } from '@preact/signals-react'
import React from 'react'

const DEBOUNCE_MS = 25
const JUPITER_TOKEN_SEARCH_URL = 'https://lite-api.jup.ag/tokens/v2/search'

export type TokenMetaSource = 'override' | 'local' | 'jupiter' | 'fallback'

export interface TokenData {
  mint: string
  decimals: number
  image?: string
  name?: string
  symbol?: string
  usdPrice: number
  source: TokenMetaSource
}

export interface ResolvedTokenMeta extends TokenData {
  mint: string
  symbol: string
  name: string
}

type JupiterTokenSearchItem = {
  id?: string
  name?: string
  symbol?: string
  icon?: string
  decimals?: number
  usdPrice?: number
}

const fallbackKnown = {
  So11111111111111111111111111111111111111112: {
    name: 'Wrapped SOL',
    symbol: 'SOL',
    decimals: 9,
    image:
      'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
  },
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: {
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    image:
      'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
  },
} as const

const overrideByMint = new Map<string, TokenOverride>(TOKEN_OVERRIDES.map((entry) => [entry.mint, entry]))
const tokenMints = signal(new Set<string>())
const tokenData = signal<Record<string, ResolvedTokenMeta>>({})

let fetchTimeout: ReturnType<typeof setTimeout> | undefined

const localLogoPromiseCache = new Map<string, Promise<string | undefined>>()

function fallbackToken(mint: string): ResolvedTokenMeta {
  const known = (fallbackKnown as Record<string, Partial<ResolvedTokenMeta>>)[mint]
  const override = overrideByMint.get(mint)

  return {
    mint,
    name: override?.name ?? known?.name ?? 'Unknown',
    symbol: override?.symbol ?? known?.symbol ?? mint.substring(0, 4),
    image: override?.logoURI ?? known?.image,
    decimals: Number(override?.decimals ?? known?.decimals ?? 9),
    usdPrice: Number(override?.usdPrice ?? 0),
    source: override ? 'override' : 'fallback',
  }
}

async function resolveLocalLogo(mint: string): Promise<string | undefined> {
  const cached = localLogoPromiseCache.get(mint)
  if (cached) return cached

  const promise = (async () => {
    const variants = ['png', 'svg', 'webp', 'jpg', 'jpeg']
    for (const ext of variants) {
      const path = `/tokens/${mint}.${ext}`
      try {
        const response = await fetch(path, { method: 'HEAD' })
        if (response.ok) return path
      } catch {
        // Keep trying other extensions.
      }
    }
    return undefined
  })()

  localLogoPromiseCache.set(mint, promise)
  return promise
}

async function fetchJupiterToken(mint: string): Promise<ResolvedTokenMeta | null> {
  try {
    const endpoint = `${JUPITER_TOKEN_SEARCH_URL}?query=${encodeURIComponent(mint)}`
    const response = await fetch(endpoint)
    if (!response.ok) return null

    const items = (await response.json()) as JupiterTokenSearchItem[]
    const selected = items.find((item) => item.id === mint) ?? items[0]
    if (!selected?.id) return null

    const base = fallbackToken(mint)

    return {
      mint,
      name: selected.name ?? base.name,
      symbol: selected.symbol ?? base.symbol,
      image: selected.icon ?? base.image,
      decimals: Number(selected.decimals ?? base.decimals),
      usdPrice: Number(selected.usdPrice ?? 0),
      source: 'jupiter',
    }
  } catch {
    return null
  }
}

async function resolveTokenMeta(mint: string): Promise<ResolvedTokenMeta> {
  const override = overrideByMint.get(mint)
  const base = fallbackToken(mint)
  const jupiter = await fetchJupiterToken(mint)
  const localLogo = override?.logoURI ?? (await resolveLocalLogo(mint))

  if (override) {
    return {
      ...base,
      ...(jupiter ?? {}),
      name: override.name ?? jupiter?.name ?? base.name,
      symbol: override.symbol ?? jupiter?.symbol ?? base.symbol,
      decimals: Number(override.decimals ?? jupiter?.decimals ?? base.decimals),
      usdPrice: Number(override.usdPrice ?? jupiter?.usdPrice ?? 0),
      image: override.logoURI ?? localLogo ?? jupiter?.image ?? base.image,
      source: 'override',
    }
  }

  if (localLogo) {
    return {
      ...(jupiter ?? base),
      mint,
      image: localLogo,
      source: 'local',
    }
  }

  if (jupiter) {
    return {
      ...jupiter,
      source: 'jupiter',
    }
  }

  return {
    ...base,
    source: 'fallback',
  }
}

const fetchTokenMeta = async (mint: string) => {
  tokenMints.value = new Set([...Array.from(tokenMints.value), mint])

  if (fetchTimeout) clearTimeout(fetchTimeout)

  fetchTimeout = setTimeout(async () => {
    const unresolved = Array.from(tokenMints.value).filter((key) => !tokenData.value[key])
    if (!unresolved.length) return

    const fetched = await Promise.all(
      unresolved.map(async (key) => {
        const meta = await resolveTokenMeta(key)
        return [key, meta] as const
      }),
    )

    tokenData.value = {
      ...tokenData.value,
      ...Object.fromEntries(fetched),
    }
    tokenMints.value = new Set()
  }, DEBOUNCE_MS)
}

export function useTokenMeta(mint: string) {
  const get = useGetTokenMeta()

  React.useEffect(() => {
    void fetchTokenMeta(String(mint))
  }, [mint])

  return get(mint)
}

export function useGetTokenMeta() {
  return (mint: string) => {
    const key = String(mint)
    return tokenData.value[key] ?? fallbackToken(key)
  }
}
