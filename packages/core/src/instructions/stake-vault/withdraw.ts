import { pdas, stakeVault } from '../..'
import type { Address } from '@solana/kit'

type BuildWithdrawIxParams = {
  staker: any
  vault: Address
  userTokenAccount?: Address
  tokenMint: Address
  vaultTokenAccount?: Address
  stakeAccount?: Address
  sharesToBurn: number | bigint
}

export async function buildWithdrawInstruction(params: BuildWithdrawIxParams) {
  const { staker, vault, tokenMint, sharesToBurn } = params

  const stakeAccount = params.stakeAccount ?? (await pdas.deriveStakeVaultStakeAccountPda(vault, staker.address as Address))
  const vaultTokenAccount = params.vaultTokenAccount ?? (await pdas.deriveAta(vault as Address, tokenMint as Address))
  const userTokenAccount = params.userTokenAccount ?? (await pdas.deriveAta(staker.address as Address, tokenMint as Address))

  const ix = stakeVault.getWithdrawInstruction({
    staker,
    vault,
    userTokenAccount,
    stakeAccount: stakeAccount as Address,
    vaultTokenAccount: vaultTokenAccount as Address,
    sharesToBurn,
    tokenProgram: pdas.TOKEN_PROGRAM_ID,
    systemProgram: pdas.SYSTEM_PROGRAM_ID,
  })

  return ix
}


