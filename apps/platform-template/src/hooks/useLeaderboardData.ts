import React from 'react'

export type Period = 'weekly' | 'monthly'

export interface Player {
  user: string
  usd_volume: number
}

interface LeaderboardResult {
  players: Player[]
}

const API_BASE_URL = 'https://api.gamba.so'

export function useLeaderboardData(period: Period, creator: string) {
  const [data, setData] = React.useState<Player[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!creator) return

    const controller = new AbortController()
    const { signal } = controller

    ;(async () => {
      try {
        setLoading(true)
        setError(null)

        const now = Date.now()
        const startTime = period === 'weekly' ? now - 7 * 24 * 60 * 60 * 1000 : now - 30 * 24 * 60 * 60 * 1000

        const url = `${API_BASE_URL}/players?creator=${creator}&sortBy=usd_volume&startTime=${startTime}`
        const response = await fetch(url, { signal })

        if (!response.ok) throw new Error(await response.text())

        const payload = (await response.json()) as LeaderboardResult
        setData(Array.isArray(payload.players) ? payload.players : [])
      } catch (err: any) {
        if (err?.name === 'AbortError') return
        setError(err?.message ?? 'Failed to fetch leaderboard data.')
      } finally {
        setLoading(false)
      }
    })()

    return () => controller.abort()
  }, [period, creator])

  return { data, loading, error }
}
