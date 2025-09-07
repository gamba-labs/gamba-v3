import { pdas, stakeVault } from '../..'
import type { Address } from '@solana/kit'

type BuildDepositIxParams = {
  staker: any
  vault: Address
  userTokenAccount?: Address
  tokenMint: Address
  vaultTokenAccount?: Address
  stakeAccount?: Address
  depositAmount: number | bigint
}

export async function buildDepositInstruction(params: BuildDepositIxParams) {
  const { staker, vault, tokenMint, depositAmount } = params

  const stakeAccount = params.stakeAccount ?? (await pdas.deriveStakeVaultStakeAccountPda(vault, staker.address as Address))
  const vaultTokenAccount = params.vaultTokenAccount ?? (await pdas.deriveAta(vault as Address, tokenMint as Address))
  const userTokenAccount = params.userTokenAccount ?? (await pdas.deriveAta(staker.address as Address, tokenMint as Address))

  const ix = stakeVault.getDepositInstruction({
    staker,
    vault,
    userTokenAccount,
    stakeAccount: stakeAccount as Address,
    depositAmount,
    vaultTokenAccount: vaultTokenAccount as Address,
    tokenProgram: pdas.TOKEN_PROGRAM_ID,
    systemProgram: pdas.SYSTEM_PROGRAM_ID,
  })

  return ix
}


