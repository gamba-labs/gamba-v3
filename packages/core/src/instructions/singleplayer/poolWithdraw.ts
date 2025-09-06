import { core, pdas } from '../..'
import type { Address } from '@solana/kit'

type BuildPoolWithdrawIxParams = {
  user: any
  pool: Address
  underlyingTokenMint: Address
  userUnderlyingAta?: Address
  userLpAta?: Address
  amount: number | bigint
  // Optional overrides
  poolUnderlyingTokenAccount?: Address
  lpMint?: Address
  gambaState?: Address
}

export async function buildPoolWithdrawInstruction(params: BuildPoolWithdrawIxParams) {
  const { user, pool, underlyingTokenMint, amount } = params

  const poolUnderlyingTokenAccount = params.poolUnderlyingTokenAccount ?? (await pdas.derivePoolUnderlyingTokenAccountPda(pool))
  const lpMint = params.lpMint ?? (await pdas.derivePoolLpMintPda(pool))
  const gambaState = params.gambaState ?? (await pdas.deriveGambaStatePda())
  const userUnderlyingAta = params.userUnderlyingAta ?? (await pdas.deriveAta(user.address as Address, underlyingTokenMint))
  const userLpAta = params.userLpAta ?? (await pdas.deriveAta(user.address as Address, lpMint))

  const ix = core.getPoolWithdrawInstruction({
    user,
    pool,
    poolUnderlyingTokenAccount,
    lpMint,
    underlyingTokenMint,
    userUnderlyingAta,
    userLpAta,
    gambaState,
    associatedTokenProgram: pdas.ASSOCIATED_TOKEN_PROGRAM_ID,
    tokenProgram: pdas.TOKEN_PROGRAM_ID,
    systemProgram: pdas.SYSTEM_PROGRAM_ID,
    amount,
  })

  return ix
}


