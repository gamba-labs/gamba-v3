import React from 'react'
import { core, pdas } from '@gamba/core'
import { useGambaRpc } from './useGambaRpc'
import { useFetchState } from './useFetchState'
import type { AddressHookOptions } from '../types'

export function useGambaState({ address, enabled = true }: AddressHookOptions = {}) {
  const { rpc } = useGambaRpc()

  const fetcher = React.useCallback(async () => {
    const target = address ?? await pdas.deriveGambaStatePda()
    const maybe = await core.fetchMaybeGambaState(rpc, target)
    if (!maybe.exists) return null
    return maybe
  }, [rpc, address])

  return useFetchState(fetcher, { enabled })
}
