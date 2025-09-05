import { multiplayer as mp, pdas } from '../..'
import { type Address } from '@solana/kit'

type BuildCreateGameNativeIxParams = {
  user: any
  gameSeed?: number | bigint
  preAllocPlayers?: number
  maxPlayers: number
  numTeams?: number
  winnersTarget: number
  wagerType: number
  payoutType: number
  wager: number | bigint
  softDuration: number | bigint
  hardDuration?: number | bigint
  minBet: number | bigint
  maxBet: number | bigint
  // Optional overrides
  gameAccount?: Address
  metadataAccount?: Address
  gambaState?: Address
}

const WSOL_MINT = 'So11111111111111111111111111111111111111112' as unknown as Address

export async function buildCreateGameNativeInstruction(params: BuildCreateGameNativeIxParams) {
  const {
    user,
    gameSeed,
    preAllocPlayers,
    maxPlayers,
    numTeams,
    winnersTarget,
    wagerType,
    payoutType,
    wager,
    softDuration,
    hardDuration,
    minBet,
    maxBet,
  } = params

  // Derive accounts
  const resolvedGameSeed = gameSeed ?? generateRandomGameSeed()
  const gameAccount = params.gameAccount ?? (await pdas.deriveMultiplayerGamePda(resolvedGameSeed))

  const metadataAccount = params.metadataAccount ?? (await pdas.deriveMultiplayerMetadataPda(gameAccount))
  const gambaState = params.gambaState ?? (await pdas.deriveMultiplayerGambaStatePda())

  // Defaults
  const resolvedNumTeams = typeof numTeams === 'number' ? numTeams : 0
  const resolvedPreAlloc = typeof preAllocPlayers === 'number' ? preAllocPlayers : Math.min(10, maxPlayers)
  const resolvedHardDuration = typeof hardDuration === 'number' || typeof hardDuration === 'bigint'
    ? hardDuration
    : (typeof softDuration === 'bigint' ? softDuration + 10n : BigInt(softDuration) + 10n)

  const ix = mp.getCreateGameNativeInstruction({
    gameAccount,
    metadataAccount,
    // Native always uses the SOL placeholder mint
    mint: WSOL_MINT,
    gameMaker: user,
    gambaState,
    systemProgram: pdas.SYSTEM_PROGRAM_ID,
    preAllocPlayers: resolvedPreAlloc,
    maxPlayers,
    numTeams: resolvedNumTeams,
    winnersTarget,
    wagerType,
    payoutType,
    wager,
    softDuration,
    hardDuration: resolvedHardDuration,
    gameSeed: resolvedGameSeed,
    minBet,
    maxBet,
  })

  return ix
}

let __seedCounter = 0
function generateRandomGameSeed(): bigint {
  __seedCounter = (__seedCounter + 1) & 0xffff
  return (BigInt(Date.now()) << 16n) | BigInt(__seedCounter)
}


