import React from 'react'

const JUPITER_TOKENS_SEARCH_URL_LITE = 'https://lite-api.jup.ag/tokens/v2/search'
const JUPITER_TOKENS_SEARCH_URL_API = 'https://api.jup.ag/tokens/v2/search'
const MAX_MINTS_PER_QUERY = 100
const REQUEST_TIMEOUT_MS = 6_000
const JUPITER_API_KEY: string | undefined = (import.meta as any).env?.VITE_JUP_API_KEY

type TokenLogoResponse = {
  id?: string
  icon?: string | null
}

const logoCache = new Map<string, string>()
const inflightByKey = new Map<string, Promise<void>>()

const normalizeMint = (mint: string) => String(mint).trim()

const chunk = <T,>(items: T[], size: number) => {
  const output: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    output.push(items.slice(i, i + size))
  }
  return output
}

const getSnapshot = (mints: string[]) => {
  const result: Record<string, string> = {}
  for (const mint of mints) {
    const logo = logoCache.get(mint)
    if (logo) result[mint] = logo
  }
  return result
}

const parseAndCacheLogos = (body: TokenLogoResponse[]) => {
  for (const entry of body) {
    if (!entry?.id || !entry?.icon) continue
    logoCache.set(normalizeMint(entry.id), entry.icon)
  }
}

const fetchBatch = async (mints: string[]) => {
  const query = encodeURIComponent(mints.join(','))
  const candidates = JUPITER_API_KEY
    ? [
        {
          url: `${JUPITER_TOKENS_SEARCH_URL_API}?query=${query}`,
          headers: { 'x-api-key': JUPITER_API_KEY },
        },
        {
          url: `${JUPITER_TOKENS_SEARCH_URL_LITE}?query=${query}`,
        },
      ]
    : [
        {
          url: `${JUPITER_TOKENS_SEARCH_URL_LITE}?query=${query}`,
        },
      ]

  for (const candidate of candidates) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const response = await fetch(candidate.url, {
        signal: controller.signal,
        headers: candidate.headers,
      })
      if (!response.ok) continue
      const body = await response.json() as TokenLogoResponse[]
      parseAndCacheLogos(body)
      return
    } catch {
      // Try next candidate endpoint.
    } finally {
      clearTimeout(timeout)
    }
  }
}

export async function preloadTokenLogos(mints: string[]): Promise<void> {
  const normalized = Array.from(new Set(mints.map(normalizeMint).filter(Boolean)))
  const missing = normalized.filter((mint) => !logoCache.has(mint))
  if (!missing.length) return

  const key = [...missing].sort().join(',')
  const existing = inflightByKey.get(key)
  if (existing) {
    await existing
    return
  }

  const run = (async () => {
    const batches = chunk(missing, MAX_MINTS_PER_QUERY)
    for (const batch of batches) {
      await fetchBatch(batch)
    }
  })().finally(() => {
    inflightByKey.delete(key)
  })

  inflightByKey.set(key, run)
  await run
}

export function useTokenLogos(mints: string[]) {
  const normalizedKey = React.useMemo(
    () => Array.from(new Set(mints.map(normalizeMint).filter(Boolean))).join(','),
    [mints],
  )
  const normalized = React.useMemo(
    () => (normalizedKey ? normalizedKey.split(',') : []),
    [normalizedKey],
  )
  const [logos, setLogos] = React.useState<Record<string, string>>(() => getSnapshot(normalized))

  React.useEffect(() => {
    let cancelled = false

    if (!normalized.length) {
      setLogos({})
      return
    }

    setLogos(getSnapshot(normalized))

    preloadTokenLogos(normalized).then(() => {
      if (cancelled) return
      setLogos(getSnapshot(normalized))
    })

    return () => {
      cancelled = true
    }
  }, [normalized, normalizedKey])

  return logos
}

export function useTokenLogo(mint?: string, fallback?: string) {
  const normalized = mint ? normalizeMint(mint) : ''
  const logos = useTokenLogos(normalized ? [normalized] : [])
  return (normalized && logos[normalized]) || fallback
}
