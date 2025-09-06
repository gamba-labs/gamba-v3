import { core, pdas } from '../..'
import type { Address } from '@solana/kit'

type BuildPoolMintBonusTokensIxParams = {
  user: any
  pool: Address
  underlyingTokenMint: Address
  userUnderlyingAta?: Address
  userBonusAta: Address
  amount: number | bigint
  // Optional overrides
  gambaState?: Address
  poolBonusUnderlyingTokenAccount?: Address
  bonusMint?: Address
  poolJackpotTokenAccount?: Address
}

export async function buildPoolMintBonusTokensInstruction(params: BuildPoolMintBonusTokensIxParams) {
  const { user, pool, underlyingTokenMint, userBonusAta, amount } = params

  const gambaState = params.gambaState ?? (await pdas.deriveGambaStatePda())
  const poolBonusUnderlyingTokenAccount = params.poolBonusUnderlyingTokenAccount ?? (await pdas.derivePoolBonusUnderlyingTokenAccountPda(pool))
  const bonusMint = params.bonusMint ?? (await pdas.derivePoolBonusMintPda(pool))
  const poolJackpotTokenAccount = params.poolJackpotTokenAccount ?? (await pdas.derivePoolJackpotTokenAccountPda(pool))
  const userUnderlyingAta = params.userUnderlyingAta ?? (await pdas.deriveAta(user.address as Address, underlyingTokenMint))

  const ix = core.getPoolMintBonusTokensInstruction({
    user,
    pool,
    gambaState,
    underlyingTokenMint,
    poolBonusUnderlyingTokenAccount,
    bonusMint,
    poolJackpotTokenAccount,
    userUnderlyingAta,
    userBonusAta,
    associatedTokenProgram: pdas.ASSOCIATED_TOKEN_PROGRAM_ID,
    tokenProgram: pdas.TOKEN_PROGRAM_ID,
    systemProgram: pdas.SYSTEM_PROGRAM_ID,
    amount,
  })

  return ix
}


