import type { Address } from '@solana/kit'
import { buildLeaveGameInstruction } from './leaveGame'
import { buildJoinGameInstruction } from './joinGame'

type BuildEditBetIxParams = {
  user: any
  gameAccount: Address
  // Optional: keep or change wager mint; defaults to WSOL in builders when omitted
  mint?: Address
  // New bet params for join
  wager: number | bigint
  creatorAddress?: Address
  team?: number
  creatorFeeBps?: number
  playerMeta?: Readonly<Uint8Array>
}

// Builds [leaveGame, joinGame] to effectively edit a bet in one transaction.
export async function buildEditBetInstructions(params: BuildEditBetIxParams) {
  const { user, gameAccount, mint, wager, creatorAddress, team, creatorFeeBps, playerMeta } = params

  const leaveIx = await buildLeaveGameInstruction({
    user,
    gameAccount,
    mint, // optional; when omitted defaults to native (WSOL) inside builder
  })

  const joinIx = await buildJoinGameInstruction({
    user,
    gameAccount,
    mint, // optional; same mint as leave or default
    creatorAddress,
    wager,
    team,
    creatorFeeBps,
    playerMeta,
  })

  return [leaveIx, joinIx]
}


