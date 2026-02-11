import type { Address } from '@solana/kit'

/**
 * =============================================================
 * QUICK START
 * Most platforms only need to edit this top section first.
 * =============================================================
 */

export const RPC_ENDPOINT: string = (import.meta as any).env?.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'

// Platform wallet receiving creator fees.
export const PLATFORM_CREATOR_ADDRESS = 'V2grJiwjs25iJYqumbHyKo5MTK7SFqZSdmoRaj8QWb9' as Address

// Fees in basis points (100 bps = 1%).
export const PLATFORM_CREATOR_FEE_BPS = 100
// Referral fee is deducted from creator fee.
export const PLATFORM_REFERRAL_FEE_BPS = 25

export type TokenConfig = {
  id: string
  ticker: string
  mint: Address
  decimals?: number
  /** Optional custom logo URL/path (for example `/tokens/my-token.png`). */
  image?: string
  baseWager?: number
}

export function defaultTokenImage(mint: Address): string {
  return `https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/${mint}/logo.png`
}

function dedupeImages(values: Array<string | undefined>): string[] {
  const out: string[] = []
  for (const value of values) {
    if (!value || out.includes(value)) continue
    out.push(value)
  }
  return out
}

/**
 * Ordered fallbacks for token logos:
 * 1) explicit token.image
 * 2) local template asset at /tokens/<token-id>.png
 * 3) indexed token-list logo by mint
 */
export function tokenImageCandidates(token: Pick<TokenConfig, 'id' | 'mint' | 'image'>): string[] {
  return dedupeImages([
    token.image,
    `/tokens/${token.id}.png`,
    defaultTokenImage(token.mint),
  ])
}

export type PoolConfig = {
  id: string
  tokenId: string
  /** Optional human label for this pool option (useful when one token has many pools). */
  label?: string
  /** If provided, pool PDA will be derived from token mint + authority. */
  poolAuthority?: Address
  /** If provided, use this pool address directly. */
  poolAddress?: Address
}

/**
 * =============================================================
 * TOKENS
 * Add the token metadata your platform uses.
 * =============================================================
 */

export const TOKENS: TokenConfig[] = [
  {
    id: 'sol',
    ticker: 'SOL',
    mint: 'So11111111111111111111111111111111111111112' as Address,
    decimals: 9,
    image: defaultTokenImage('So11111111111111111111111111111111111111112' as Address),
    baseWager: 0.01 * 1e9,
  },
  {
    id: 'usdc',
    ticker: 'USDC',
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' as Address,
    decimals: 6,
    image: defaultTokenImage('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' as Address),
    baseWager: 0.5 * 1e6,
  },
]

/**
 * Helper to define a pool entry.
 * `tokenId` must match one of the ids in TOKENS.
 */
function pool(id: string, tokenId: string, options: Omit<PoolConfig, 'id' | 'tokenId'> = {}): PoolConfig {
  return {
    id,
    tokenId,
    ...options,
  }
}

/**
 * =============================================================
 * POOLS (Edit this list when cloning the template)
 * Multiple pools can point to the same token.
 * =============================================================
 */
export const POOLS: PoolConfig[] = [
  pool('sol-main', 'sol'),
  pool('usdc-main', 'usdc'),
  // Example private pool:
  // pool('sol-private', 'sol', { poolAuthority: 'Fki4Yah4ZXvFmDUw8WspxRAEmfERPth7PPEwPYt3bior' as Address }),
  // Example direct pool address:
  // pool('sol-direct', 'sol', { poolAddress: '<POOL_ADDRESS>' as Address }),
]

export const DEFAULT_POOL_ID: string = POOLS[0]!.id

// Default public pool authority used unless a pool override is provided.
export const DEFAULT_POOL_AUTHORITY = '11111111111111111111111111111111' as Address

/**
 * =============================================================
 * REFERRAL + PLATFORM FEATURES
 * =============================================================
 */

// Whether a user can remove an accepted referral invite.
export const PLATFORM_ALLOW_REFERRER_REMOVAL = true
// URL param used for invite links, for example ?code=<wallet>.
export const REFERRAL_CODE_PREFIX = 'code'

// Enable/disable leaderboard modal in header.
export const ENABLE_LEADERBOARD = true

// Recent plays scope: 'platform' (pools from POOLS) or 'global'
export const RECENT_PLAYS_SCOPE: 'platform' | 'global' = 'platform'

/**
 * =============================================================
 * UI CONTENT / OPTIONAL TWEAKS
 * =============================================================
 */

export const FEATURED_GAME_INLINE = false
export const FEATURED_GAME_ID = 'flip'

export const LANDING_HEADLINE = 'Welcome to Gamba v3'
export const LANDING_SUBHEAD = 'A fair, simple and decentralized casino on Solana.'

export type LandingAction =
  | {
      id: string
      label: string
      type: 'open'
      href?: string
    }
  | {
      id: string
      label: string
      type: 'copy'
      value?: string
    }

export const PLATFORM_SHARABLE_URL = 'https://play.gamba.so'

export const LANDING_ACTIONS: LandingAction[] = [
  {
    id: 'invite',
    label: 'Copy Invite',
    type: 'copy',
    value: PLATFORM_SHARABLE_URL,
  },
  {
    id: 'liquidity',
    label: 'Add Liquidity',
    type: 'open',
    href: 'https://v2.gamba.so/',
  },
  {
    id: 'discord',
    label: 'Discord',
    type: 'open',
    href: 'https://discord.gg/HSTtFFwR',
  },
]
