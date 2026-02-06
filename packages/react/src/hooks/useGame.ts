import React from 'react'
import { core } from '@gamba/core'
import { useGambaRpc } from './useGambaRpc'
import { useFetchState } from './useFetchState'
import type { AddressHookOptions } from '../types'

export function useGame({ address, enabled = true }: AddressHookOptions = {}) {
  const { rpc } = useGambaRpc()

  const fetcher = React.useCallback(async () => {
    if (!address) return null
    const maybe = await core.fetchMaybeGame(rpc, address)
    if (!maybe.exists) return null
    return maybe
  }, [rpc, address])

  return useFetchState(fetcher, { enabled: enabled && !!address })
}
