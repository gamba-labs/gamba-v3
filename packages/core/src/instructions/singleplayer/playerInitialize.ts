import { core, pdas } from '../..'
import type { Address } from '@solana/kit'

type BuildPlayerInitializeIxParams = {
  user: any
  player?: Address
  game?: Address
}

export async function buildPlayerInitializeInstruction(params: BuildPlayerInitializeIxParams) {
  const { user } = params

  const player = params.player ?? (await pdas.derivePlayerPda(user.address as Address))
  const game = params.game ?? (await pdas.deriveGamePda(user.address as Address))

  const ix = core.getPlayerInitializeInstruction({
    player,
    game,
    user,
    systemProgram: pdas.SYSTEM_PROGRAM_ID,
  })

  return ix
}


