import { core, pdas } from '../..'
import type { Address } from '@solana/kit'

type BuildPlayerCloseIxParams = {
  user: any
  player?: Address
  game?: Address
}

export async function buildPlayerCloseInstruction(params: BuildPlayerCloseIxParams) {
  const { user } = params

  const player = params.player ?? (await pdas.derivePlayerPda(user.address as Address))
  const game = params.game ?? (await pdas.deriveGamePda(user.address as Address))

  const ix = core.getPlayerCloseInstruction({
    user,
    player,
    game,
  })

  return ix
}


