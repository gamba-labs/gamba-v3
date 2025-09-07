import {
  getProgramDerivedAddress,
  getAddressEncoder,
  getBytesEncoder,
  getU64Encoder,
  type Address,
} from '@solana/kit'
import { core, multiplayer, stakeVault, referral } from './index'

export const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' as Address
export const ASSOCIATED_TOKEN_PROGRAM_ID = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL' as Address
export const SYSTEM_PROGRAM_ID = '11111111111111111111111111111111' as Address
export const METAPLEX_TOKEN_METADATA_PROGRAM_ID = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s' as Address

const ascii = (s: string) => new Uint8Array([...s].map((c) => c.charCodeAt(0)))

export async function derivePlayerPda(user: Address): Promise<Address> {
  const [addr] = await getProgramDerivedAddress({
    programAddress: core.GAMBA_PROGRAM_ADDRESS as Address,
    seeds: [getBytesEncoder().encode(ascii('PLAYER')), getAddressEncoder().encode(user)],
  })
  return addr as Address
}

export async function deriveGamePda(user: Address): Promise<Address> {
  const [addr] = await getProgramDerivedAddress({
    programAddress: core.GAMBA_PROGRAM_ADDRESS as Address,
    seeds: [getBytesEncoder().encode(ascii('GAME')), getAddressEncoder().encode(user)],
  })
  return addr as Address
}

export async function deriveGambaStatePda(): Promise<Address> {
  const [addr] = await getProgramDerivedAddress({
    programAddress: core.GAMBA_PROGRAM_ADDRESS as Address,
    seeds: [getBytesEncoder().encode(ascii('GAMBA_STATE'))],
  })
  return addr as Address
}

export async function deriveMultiplayerGambaStatePda(): Promise<Address> {
  const [addr] = await getProgramDerivedAddress({
    programAddress: multiplayer.MULTIPLAYER_PROGRAM_ADDRESS as Address,
    seeds: [getBytesEncoder().encode(ascii('GAMBA_STATE'))],
  })
  return addr as Address
}

export async function deriveMultiplayerGameAccountTaPda(gameAccount: Address): Promise<Address> {
  const [addr] = await getProgramDerivedAddress({
    programAddress: multiplayer.MULTIPLAYER_PROGRAM_ADDRESS as Address,
    seeds: [getAddressEncoder().encode(gameAccount)],
  })
  return addr as Address
}

export async function deriveMultiplayerGamePda(gameSeed: bigint | number): Promise<Address> {
  const [addr] = await getProgramDerivedAddress({
    programAddress: multiplayer.MULTIPLAYER_PROGRAM_ADDRESS as Address,
    seeds: [
      getBytesEncoder().encode(ascii('GAME')),
      getU64Encoder().encode(BigInt(gameSeed)),
    ],
  })
  return addr as Address
}

export async function deriveMultiplayerMetadataPda(gameAccount: Address): Promise<Address> {
  const [addr] = await getProgramDerivedAddress({
    programAddress: multiplayer.MULTIPLAYER_PROGRAM_ADDRESS as Address,
    seeds: [getBytesEncoder().encode(ascii('METADATA')), getAddressEncoder().encode(gameAccount)],
  })
  return addr as Address
}

export async function derivePoolBonusMintPda(pool: Address): Promise<Address> {
  const [addr] = await getProgramDerivedAddress({
    programAddress: core.GAMBA_PROGRAM_ADDRESS as Address,
    seeds: [getBytesEncoder().encode(ascii('POOL_BONUS_MINT')), getAddressEncoder().encode(pool)],
  })
  return addr as Address
}

export async function derivePoolJackpotTokenAccountPda(pool: Address): Promise<Address> {
  const [addr] = await getProgramDerivedAddress({
    programAddress: core.GAMBA_PROGRAM_ADDRESS as Address,
    seeds: [getBytesEncoder().encode(ascii('POOL_JACKPOT')), getAddressEncoder().encode(pool)],
  })
  return addr as Address
}

export async function derivePoolUnderlyingTokenAccountPda(pool: Address): Promise<Address> {
  const [addr] = await getProgramDerivedAddress({
    programAddress: core.GAMBA_PROGRAM_ADDRESS as Address,
    seeds: [getBytesEncoder().encode(ascii('POOL_ATA')), getAddressEncoder().encode(pool)],
  })
  return addr as Address
}

export async function derivePoolBonusUnderlyingTokenAccountPda(pool: Address): Promise<Address> {
  const [addr] = await getProgramDerivedAddress({
    programAddress: core.GAMBA_PROGRAM_ADDRESS as Address,
    seeds: [
      getBytesEncoder().encode(ascii('POOL_BONUS_UNDERLYING_TA')),
      getAddressEncoder().encode(pool),
    ],
  })
  return addr as Address
}

export async function derivePoolPda(underlyingTokenMint: Address, poolAuthority: Address): Promise<Address> {
  const [addr] = await getProgramDerivedAddress({
    programAddress: core.GAMBA_PROGRAM_ADDRESS as Address,
    seeds: [
      getBytesEncoder().encode(ascii('POOL')),
      getAddressEncoder().encode(underlyingTokenMint),
      getAddressEncoder().encode(poolAuthority),
    ],
  })
  return addr as Address
}

export async function derivePoolLpMintPda(pool: Address): Promise<Address> {
  const [addr] = await getProgramDerivedAddress({
    programAddress: core.GAMBA_PROGRAM_ADDRESS as Address,
    seeds: [
      getBytesEncoder().encode(ascii('POOL_LP_MINT')),
      getAddressEncoder().encode(pool),
    ],
  })
  return addr as Address
}

export async function deriveMetaplexMetadataPda(mint: Address): Promise<Address> {
  const [addr] = await getProgramDerivedAddress({
    programAddress: METAPLEX_TOKEN_METADATA_PROGRAM_ID as Address,
    seeds: [
      getBytesEncoder().encode(ascii('metadata')),
      getAddressEncoder().encode(METAPLEX_TOKEN_METADATA_PROGRAM_ID as Address),
      getAddressEncoder().encode(mint),
    ],
  })
  return addr as Address
}

export async function deriveStakeVaultStakeAccountPda(
  vault: Address,
  staker: Address,
): Promise<Address> {
  const [addr] = await getProgramDerivedAddress({
    programAddress: stakeVault.STAKE_VAULT_PROGRAM_ADDRESS as Address,
    seeds: [getAddressEncoder().encode(vault), getAddressEncoder().encode(staker)],
  })
  return addr as Address
}

export async function deriveStakeVaultVaultPda(
  authority: Address,
  vaultId: number | bigint,
): Promise<Address> {
  const [addr] = await getProgramDerivedAddress({
    programAddress: stakeVault.STAKE_VAULT_PROGRAM_ADDRESS as Address,
    seeds: [
      getBytesEncoder().encode(new Uint8Array([118, 97, 117, 108, 116])), // "vault"
      getAddressEncoder().encode(authority),
      getU64Encoder().encode(BigInt(vaultId)),
    ],
  })
  return addr as Address
}

export async function deriveReferralAccountPda(
  creator: Address,
  authority: Address,
): Promise<Address> {
  const [addr] = await getProgramDerivedAddress({
    programAddress: referral.REFER_PROGRAM_PROGRAM_ADDRESS as Address,
    seeds: [getAddressEncoder().encode(creator), getAddressEncoder().encode(authority)],
  })
  return addr as Address
}

export async function deriveAta(
  owner: Address,
  mint: Address,
  associatedTokenProgram: Address = ASSOCIATED_TOKEN_PROGRAM_ID,
  tokenProgram: Address = TOKEN_PROGRAM_ID,
): Promise<Address> {
  const [addr] = await getProgramDerivedAddress({
    programAddress: associatedTokenProgram,
    seeds: [
      getAddressEncoder().encode(owner),
      getAddressEncoder().encode(tokenProgram),
      getAddressEncoder().encode(mint),
    ],
  })
  return addr as Address
}


