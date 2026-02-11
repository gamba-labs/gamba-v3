import { core, pdas } from '@gamba/core'
import type { Address } from '@solana/kit'
import bs58 from 'bs58'

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function toBigInt(value: unknown): bigint {
  if (typeof value === 'bigint') return value
  if (typeof value === 'number' && Number.isFinite(value)) return BigInt(Math.floor(value))
  if (typeof value === 'string' && /^\d+$/.test(value)) return BigInt(value)
  if (value && typeof value === 'object' && 'toString' in value) {
    const text = String(value)
    if (/^\d+$/.test(text)) return BigInt(text)
  }
  return 0n
}

function toNumber(value: unknown): number {
  const n = Number(toBigInt(value))
  return Number.isFinite(n) ? n : 0
}

export interface UiPool {
  publicKey: string
  state: any
  underlyingTokenMint: string
  poolAuthority: string
  liquidity: bigint
  lpSupply: bigint
  ratio: number
  bonusBalance: bigint
  jackpotBalance: bigint
  plays: number
}

async function getTokenAmount(rpc: any, tokenAccount: Address): Promise<bigint> {
  try {
    const response = await rpc.getTokenAccountBalance(tokenAccount).send()
    return BigInt((response as any)?.value?.amount ?? '0')
  } catch {
    return 0n
  }
}

async function getTokenSupply(rpc: any, mint: Address): Promise<bigint> {
  try {
    const response = await rpc.getTokenSupply(mint).send()
    return BigInt((response as any)?.value?.amount ?? '0')
  } catch {
    return 0n
  }
}

export async function fetchPoolDetails(rpc: any, poolAddress: Address): Promise<UiPool | null> {
  const pool = await core.fetchMaybePool(rpc, poolAddress)
  if (!pool.exists) return null

  const data = pool.data as any
  const underlyingTokenMint = String(data.underlyingTokenMint)
  const poolAuthority = String(data.poolAuthority)
  const liquidity = toBigInt(data.liquidityCheckpoint)

  const [lpMint, poolBonusUnderlyingTokenAccount, poolJackpotTokenAccount] = await Promise.all([
    pdas.derivePoolLpMintPda(poolAddress),
    pdas.derivePoolBonusUnderlyingTokenAccountPda(poolAddress),
    pdas.derivePoolJackpotTokenAccountPda(poolAddress),
  ])

  const [lpSupply, bonusBalance, jackpotBalance] = await Promise.all([
    getTokenSupply(rpc, lpMint),
    getTokenAmount(rpc, poolBonusUnderlyingTokenAccount),
    getTokenAmount(rpc, poolJackpotTokenAccount),
  ])

  const ratio = lpSupply === 0n ? 1 : Number(liquidity) / Number(lpSupply)

  return {
    publicKey: String(poolAddress),
    state: data,
    underlyingTokenMint,
    poolAuthority,
    liquidity,
    lpSupply,
    ratio,
    bonusBalance,
    jackpotBalance,
    plays: toNumber(data.plays),
  }
}

export async function fetchPools(rpc: any): Promise<UiPool[]> {
  const discriminator = core.getPoolDiscriminatorBytes()
  const discB58 = bs58.encode(new Uint8Array(discriminator))
  const accounts: any[] = await rpc
    .getProgramAccounts(core.GAMBA_PROGRAM_ADDRESS, {
      filters: [{ memcmp: { offset: 0n, bytes: discB58 as any, encoding: 'base58' } }],
      encoding: 'base64',
    })
    .send()

  return await Promise.all(
    accounts.map(async (item) => {
      const [b64] = item.account.data as [string, string]
      const bytes = base64ToBytes(b64)
      const decoded = core.getPoolDecoder().decode(bytes) as any
      const publicKey = String(item.pubkey)
      const underlyingTokenMint = String(decoded.underlyingTokenMint)
      const poolAuthority = String(decoded.poolAuthority)
      const liquidity = toBigInt(decoded.liquidityCheckpoint)

      const [lpMint, poolBonusUnderlyingTokenAccount, poolJackpotTokenAccount] = await Promise.all([
        pdas.derivePoolLpMintPda(publicKey as Address),
        pdas.derivePoolBonusUnderlyingTokenAccountPda(publicKey as Address),
        pdas.derivePoolJackpotTokenAccountPda(publicKey as Address),
      ])

      const [lpSupply, bonusBalance, jackpotBalance] = await Promise.all([
        getTokenSupply(rpc, lpMint),
        getTokenAmount(rpc, poolBonusUnderlyingTokenAccount),
        getTokenAmount(rpc, poolJackpotTokenAccount),
      ])

      return {
        publicKey,
        state: decoded,
        underlyingTokenMint,
        poolAuthority,
        liquidity,
        lpSupply,
        ratio: lpSupply === 0n ? 1 : Number(liquidity) / Number(lpSupply),
        bonusBalance,
        jackpotBalance,
        plays: toNumber(decoded.plays),
      } satisfies UiPool
    }),
  )
}
