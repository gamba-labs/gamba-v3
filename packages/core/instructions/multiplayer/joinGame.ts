import { multiplayer as mp, pdas } from '../../src'
import type { Address } from '@solana/kit'

type BuildJoinGameIxParams = {
  user: any
  gameAccount: Address
  mint?: Address
  creatorAddress?: Address
  wager: number | bigint
  team?: number
  creatorFeeBps?: number
  playerMeta?: Readonly<Uint8Array>
}

const WSOL_MINT = 'So11111111111111111111111111111111111111112' as unknown as Address

export async function buildJoinGameInstruction(params: BuildJoinGameIxParams) {
  const {
    user,
    gameAccount,
    mint,
    creatorAddress,
    wager,
    team = 0,
    creatorFeeBps = 0,
    playerMeta = new Uint8Array(32),
  } = params

  const resolvedMint = (mint ?? WSOL_MINT) as Address
  const resolvedIsNative = (resolvedMint as unknown as string) === (WSOL_MINT as unknown as string)
  const creator = (creatorAddress ?? (user.address as Address)) as Address

  const gambaState = await pdas.deriveMultiplayerGambaStatePda()
  const metadataAccount = await pdas.deriveMultiplayerMetadataPda(gameAccount)

  // Optional SPL-only accounts
  const gameAccountTa = resolvedIsNative ? undefined : await pdas.deriveMultiplayerGameAccountTaPda(gameAccount)
  const playerAta = resolvedIsNative ? undefined : await pdas.deriveAta(user.address as Address, resolvedMint)
  const creatorAta = await pdas.deriveAta(creator, resolvedMint)

  const ix = mp.getJoinGameInstruction({
    gameAccount,
    gambaState,
    ...(gameAccountTa ? { gameAccountTa } : {}),
    mint: resolvedMint,
    playerAccount: user,
    ...(playerAta ? { playerAta } : {}),
    creatorAddress: creator,
    creatorAta,
    metadataAccount,
    systemProgram: pdas.SYSTEM_PROGRAM_ID,
    associatedTokenProgram: pdas.ASSOCIATED_TOKEN_PROGRAM_ID,
    tokenProgram: pdas.TOKEN_PROGRAM_ID,
    creatorFeeBps,
    wager,
    team,
    playerMeta,
  })

  return ix
}


