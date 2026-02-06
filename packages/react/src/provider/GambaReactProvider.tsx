import React from 'react'
import { createSolanaRpc } from '@solana/kit'
import { GambaReactContext } from './context'
import type { GambaReactConfig, GambaReactProviderProps } from '../types'

const DEFAULT_CONFIG: GambaReactConfig = {
  defaultCommitment: 'confirmed',
  computeUnitBuffer: 1.15,
  defaultComputeUnits: 200_000,
  debug: false,
}

function toWsUrl(rpcUrl: string) {
  return rpcUrl.replace(/^http/i, 'ws')
}

export function GambaReactProvider({
  children,
  rpcUrl,
  defaultCommitment,
  computeUnitBuffer,
  defaultComputeUnits,
  debug,
}: GambaReactProviderProps) {
  const rpc = React.useMemo(() => createSolanaRpc(rpcUrl), [rpcUrl])
  const wsUrl = React.useMemo(() => toWsUrl(rpcUrl), [rpcUrl])

  const config = React.useMemo<GambaReactConfig>(() => ({
    defaultCommitment: defaultCommitment ?? DEFAULT_CONFIG.defaultCommitment,
    computeUnitBuffer: computeUnitBuffer ?? DEFAULT_CONFIG.computeUnitBuffer,
    defaultComputeUnits: defaultComputeUnits ?? DEFAULT_CONFIG.defaultComputeUnits,
    debug: debug ?? DEFAULT_CONFIG.debug,
  }), [defaultCommitment, computeUnitBuffer, defaultComputeUnits, debug])

  return (
    <GambaReactContext.Provider value={{ rpc, rpcUrl, wsUrl, config }}>
      {children}
    </GambaReactContext.Provider>
  )
}
