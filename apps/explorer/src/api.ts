import useSWR from 'swr'

export const API_ENDPOINT = ((import.meta as any).env?.VITE_GAMBA_API_ENDPOINT || 'https://api.gamba.so').replace(/\/+$/, '')

export interface StatsResponse {
  players: number
  usd_volume: number
  plays: number
  creators: number
  revenue_usd: number
  active_players: number
  player_net_profit_usd?: number
  first_bet_time?: number
}

export interface StatusResponse {
  syncing: boolean
}

export interface PlayerResponse {
  games_played: number
  games_won: number
  usd_profit: number
  usd_volume: number
}

export interface RecentPlaysResponse {
  total?: number
  results: {
    signature: string
    user: string
    token: string
    creator: string
    time: number
    wager: number
    payout: number
    jackpot: number
    multiplier: number
    profit?: number
    usd_wager?: number
    usd_profit?: number
  }[]
}

export interface PoolChangesResponse {
  results: {
    signature: string
    user: string
    token: string
    pool: string
    creator: string
    time: number
    amount: number
    post_liqudity: number
    action: 'deposit' | 'withdraw'
  }[]
}

export interface DailyVolume {
  total_volume: number
  date: string
}

export interface RatioData {
  date: string
  lp_supply: number
  pool_liquidity: number
}

export interface TopCreatorsData {
  creator: string
  usd_volume: number
  usd_revenue: number
}

export interface TopPlayersResponse {
  players: {
    user: string
    usd_profit: number
    usd_profit_net: number
    usd_fees: number
    usd_volume: number
    token_volume?: number
    token_profit?: number
  }[]
}

export type PlatformTokenResponse = {
  usd_volume: number
  volume: number
  token: string
  num_plays: number
}[]

export const apiFetcher = async <T>(endpoint: string) => {
  const res = await window.fetch(endpoint, {
    headers: {
      'ngrok-skip-browser-warning': 'true',
    },
  })

  if (res.ok) {
    return (await res.json()) as T
  }

  try {
    const data = await res.json()
    throw new Error(String((data as any)?.error ?? res.statusText))
  } catch {
    throw new Error(res.statusText)
  }
}

export function getApiUrl(endpoint: string, _query?: Record<string, unknown>) {
  const query = _query ?? {}
  const trimmed = Object.entries(query).reduce(
    (prev, [key, value]) => {
      if (typeof value === 'undefined' || value === null || value === '') return prev
      return { ...prev, [key]: String(value) }
    },
    {} as Record<string, string>,
  )
  const params = new URLSearchParams(trimmed)
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  return `${API_ENDPOINT}${path}?${params.toString()}`
}

export function useApi<T>(endpoint: string, query?: Record<string, unknown>) {
  return useSWR<T>(getApiUrl(endpoint, query), apiFetcher)
}
