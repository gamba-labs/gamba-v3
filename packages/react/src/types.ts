import type { Address, Instruction } from '@solana/kit'
import type { PropsWithChildren } from 'react'

export type GambaCommitment = 'processed' | 'confirmed' | 'finalized'

export type GambaReactConfig = {
  defaultCommitment: GambaCommitment
  computeUnitBuffer: number
  defaultComputeUnits: number
  debug: boolean
}

export type GambaReactProviderProps = PropsWithChildren<{
  rpcUrl: string
  defaultCommitment?: GambaCommitment
  computeUnitBuffer?: number
  defaultComputeUnits?: number
  debug?: boolean
}>

export type SimResult = unknown

export type SendSmartTransactionResult = {
  simulate: (instructions: Instruction<Address>[]) => Promise<SimResult>
  send: (instructions: Instruction<Address>[]) => Promise<string>
  signer: any
  ready: boolean
}

export type FetchStateResult<T> = {
  data: T | null
  loading: boolean
  error: unknown | null
  refetch: () => Promise<T | null>
  updatedAt: number | null
}

export type AddressHookOptions = {
  address?: Address | null
  enabled?: boolean
}

export type UserHookOptions = {
  user?: Address | null
  enabled?: boolean
}
