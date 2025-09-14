import type { Address } from '@solana/kit'

export const RPC_ENDPOINT: string = (import.meta as any).env?.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'

export type TokenConfig = {
  id: string
  ticker: string
  mint: Address
  /** If provided, pool PDA will be derived from mint + authority */
  poolAuthority?: Address
  /** If provided, use this pool address directly */
  poolAddress?: Address
  decimals?: number
  image?: string
  baseWager?: number
}

export const TOKENS: TokenConfig[] = [
  {
    id: 'sol',
    ticker: 'SOL',
    mint: 'So11111111111111111111111111111111111111112' as Address,
    decimals: 9,
  },
  {
    id: 'usdc',
    ticker: 'USDC',
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' as Address,
    decimals: 6,
  },
]

export const DEFAULT_TOKEN_ID: string = TOKENS[0]!.id

// Default public pool authority (used unless a private pool authority is specified)
export const DEFAULT_POOL_AUTHORITY = '11111111111111111111111111111111' as Address

// Platform creator address (fee recipient), set this to your platform's address
export const PLATFORM_CREATOR_ADDRESS = 'V2grJiwjs25iJYqumbHyKo5MTK7SFqZSdmoRaj8QWb9' as Address

// Recent plays scope: 'platform' (pools from TOKENS) or 'global'
export const RECENT_PLAYS_SCOPE: 'platform' | 'global' = 'platform'



