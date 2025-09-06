import { core, pdas } from '../..'
import type { Address } from '@solana/kit'

type BuildPoolInitializeIxParams = {
  initializer: any
  underlyingTokenMint: Address
  poolAuthority: Address
  lookupAddress: Address
  // Optional overrides
  gambaState?: Address
  pool?: Address
  poolUnderlyingTokenAccount?: Address
  poolBonusUnderlyingTokenAccount?: Address
  poolJackpotTokenAccount?: Address
  gambaStateAta?: Address
  lpMint?: Address
  lpMintMetadata?: Address
  bonusMint?: Address
  bonusMintMetadata?: Address
}

export async function buildPoolInitializeInstruction(params: BuildPoolInitializeIxParams) {
  const {
    initializer,
    underlyingTokenMint,
    poolAuthority,
    lookupAddress,
  } = params

  const gambaState = params.gambaState ?? (await pdas.deriveGambaStatePda())
  const pool = params.pool ?? (await pdas.derivePoolPda(underlyingTokenMint, poolAuthority))
  const poolUnderlyingTokenAccount = params.poolUnderlyingTokenAccount ?? (await pdas.derivePoolUnderlyingTokenAccountPda(pool))
  const poolBonusUnderlyingTokenAccount = params.poolBonusUnderlyingTokenAccount ?? (await pdas.derivePoolBonusUnderlyingTokenAccountPda(pool))
  const poolJackpotTokenAccount = params.poolJackpotTokenAccount ?? (await pdas.derivePoolJackpotTokenAccountPda(pool))
  const lpMint = params.lpMint ?? (await pdas.derivePoolLpMintPda(pool))
  const lpMintMetadata = params.lpMintMetadata ?? (await pdas.deriveMetaplexMetadataPda(lpMint))
  const bonusMint = params.bonusMint ?? (await pdas.derivePoolBonusMintPda(pool))
  const bonusMintMetadata = params.bonusMintMetadata ?? (await pdas.deriveMetaplexMetadataPda(bonusMint))
  const gambaStateAta = params.gambaStateAta ?? (await pdas.deriveAta(gambaState, underlyingTokenMint))

  const ix = core.getPoolInitializeInstruction({
    initializer,
    gambaState,
    underlyingTokenMint,
    pool,
    poolUnderlyingTokenAccount,
    poolBonusUnderlyingTokenAccount,
    poolJackpotTokenAccount,
    gambaStateAta,
    lpMint,
    lpMintMetadata,
    bonusMint,
    bonusMintMetadata,
    associatedTokenProgram: pdas.ASSOCIATED_TOKEN_PROGRAM_ID,
    tokenProgram: pdas.TOKEN_PROGRAM_ID,
    systemProgram: pdas.SYSTEM_PROGRAM_ID,
    rent: 'SysvarRent111111111111111111111111111111111' as Address,
    tokenMetadataProgram: pdas.METAPLEX_TOKEN_METADATA_PROGRAM_ID,
    poolAuthority,
    lookupAddress,
  })

  return ix
}


export async function getPoolInitializeLookupAddresses(input: { underlyingTokenMint: Address; poolAuthority: Address }) {
  const { underlyingTokenMint, poolAuthority } = input
  const gambaState = await pdas.deriveGambaStatePda()
  const pool = await pdas.derivePoolPda(underlyingTokenMint, poolAuthority)
  const poolUnderlyingTokenAccount = await pdas.derivePoolUnderlyingTokenAccountPda(pool)
  const poolBonusUnderlyingTokenAccount = await pdas.derivePoolBonusUnderlyingTokenAccountPda(pool)
  const gambaStateAta = await pdas.deriveAta(gambaState, underlyingTokenMint)
  const bonusMint = await pdas.derivePoolBonusMintPda(pool)
  const poolJackpotTokenAccount = await pdas.derivePoolJackpotTokenAccountPda(pool)

  const addresses = [
    pool,
    underlyingTokenMint,
    poolUnderlyingTokenAccount,
    poolBonusUnderlyingTokenAccount,
    gambaState,
    gambaStateAta,
    bonusMint,
    poolJackpotTokenAccount,
  ] as Address[]

  return {
    addresses,
    derived: {
      pool,
      poolUnderlyingTokenAccount,
      poolBonusUnderlyingTokenAccount,
      gambaState,
      gambaStateAta,
      bonusMint,
      poolJackpotTokenAccount,
    },
  }
}


