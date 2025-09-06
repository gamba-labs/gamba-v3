import { core, pdas } from '../..'
import type { Address } from '@solana/kit'

type BuildDistributeFeesIxParams = {
  user: any
  underlyingTokenMint: Address
  distributionRecipient: Address
  nativeSol: boolean
  // Optional overrides
  gambaState?: Address
  gambaStateAta?: Address
  distributionRecipientAta?: Address
}

export async function buildDistributeFeesInstruction(params: BuildDistributeFeesIxParams) {
  const { user, underlyingTokenMint, distributionRecipient, nativeSol } = params

  const gambaState = params.gambaState ?? (await pdas.deriveGambaStatePda())
  const gambaStateAta = params.gambaStateAta ?? (await pdas.deriveAta(gambaState, underlyingTokenMint))
  const distributionRecipientAta = params.distributionRecipientAta ?? (await pdas.deriveAta(distributionRecipient, underlyingTokenMint))

  const ix = core.getDistributeFeesInstruction({
    signer: user,
    underlyingTokenMint,
    gambaState,
    gambaStateAta,
    distributionRecipient,
    distributionRecipientAta,
    associatedTokenProgram: pdas.ASSOCIATED_TOKEN_PROGRAM_ID,
    tokenProgram: pdas.TOKEN_PROGRAM_ID,
    systemProgram: pdas.SYSTEM_PROGRAM_ID,
    nativeSol,
  })

  return ix
}


