import { multiplayer as mp, pdas } from '../..'
import type { Address } from '@solana/kit'

type BuildLeaveGameIxParams = {
  user: any
  gameAccount: Address
  mint?: Address
  // Optional SPL-only accounts; if omitted we derive
  playerAta?: Address
  gameAccountTa?: Address
  metadataAccount?: Address
}

const WSOL_MINT = 'So11111111111111111111111111111111111111112' as unknown as Address

export async function buildLeaveGameInstruction(params: BuildLeaveGameIxParams) {
  const { user, gameAccount } = params
  const resolvedMint = (params.mint ?? WSOL_MINT) as Address
  const isNative = (resolvedMint as unknown as string) === (WSOL_MINT as unknown as string)

  const metadataAccount = params.metadataAccount ?? (await pdas.deriveMultiplayerMetadataPda(gameAccount))
  const gameAccountTa = params.gameAccountTa ?? (isNative ? undefined : await pdas.deriveMultiplayerGameAccountTaPda(gameAccount))
  const playerAta = params.playerAta ?? (isNative ? undefined : await pdas.deriveAta(user.address as Address, resolvedMint))

  const ix = mp.getLeaveGameInstruction({
    gameAccount,
    mint: resolvedMint,
    playerAccount: user,
    ...(playerAta ? { playerAta } : {}),
    ...(gameAccountTa ? { gameAccountTa } : {}),
    metadataAccount,
    systemProgram: pdas.SYSTEM_PROGRAM_ID,
    associatedTokenProgram: pdas.ASSOCIATED_TOKEN_PROGRAM_ID,
    tokenProgram: pdas.TOKEN_PROGRAM_ID,
  })

  return ix
}


