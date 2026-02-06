import React from 'react'
import type { FetchStateResult } from '../types'

export function useFetchState<T>(
  fetcher: () => Promise<T | null>,
  options: { enabled?: boolean } = {},
): FetchStateResult<T> {
  const enabled = options.enabled ?? true
  const [data, setData] = React.useState<T | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<unknown | null>(null)
  const [updatedAt, setUpdatedAt] = React.useState<number | null>(null)

  const requestIdRef = React.useRef(0)
  const mountedRef = React.useRef(true)

  React.useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const refetch = React.useCallback(async () => {
    if (!enabled) {
      if (!mountedRef.current) return null
      setData(null)
      setError(null)
      setLoading(false)
      return null
    }

    const requestId = ++requestIdRef.current
    setLoading(true)
    setError(null)

    try {
      const next = await fetcher()
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return next
      }

      setData(next)
      setLoading(false)
      setUpdatedAt(Date.now())
      return next
    } catch (nextError) {
      if (!mountedRef.current || requestId !== requestIdRef.current) {
        return null
      }

      setData(null)
      setLoading(false)
      setError(nextError)
      return null
    }
  }, [enabled, fetcher])

  React.useEffect(() => {
    if (!enabled) {
      setData(null)
      setError(null)
      setLoading(false)
      return
    }
    void refetch()
  }, [enabled, refetch])

  return { data, loading, error, refetch, updatedAt }
}
