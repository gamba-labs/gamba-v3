import { multiplayer as mp, pdas } from '../..'
import type { Address } from '@solana/kit'

type BuildSelectWinnersIxParams = {
  rng: any
  gameAccount: Address
  // Optional overrides
  gambaState?: Address
}

export async function buildSelectWinnersInstruction(params: BuildSelectWinnersIxParams) {
  const { rng, gameAccount } = params

  const gambaState = params.gambaState ?? (await pdas.deriveMultiplayerGambaStatePda())

  const ix = mp.getSelectWinnersInstruction({
    rng,
    gambaState,
    gameAccount,
  })

  return ix
}


