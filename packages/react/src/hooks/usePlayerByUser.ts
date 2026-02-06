import React from 'react'
import { core, pdas } from '@gamba/core'
import { useGambaRpc } from './useGambaRpc'
import { useFetchState } from './useFetchState'
import type { UserHookOptions } from '../types'

export function usePlayerByUser({ user, enabled = true }: UserHookOptions = {}) {
  const { rpc } = useGambaRpc()

  const fetcher = React.useCallback(async () => {
    if (!user) return null
    const address = await pdas.derivePlayerPda(user)
    const maybe = await core.fetchMaybePlayer(rpc, address)
    if (!maybe.exists) return null
    return maybe
  }, [rpc, user])

  return useFetchState(fetcher, { enabled: enabled && !!user })
}
