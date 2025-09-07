import { pdas, stakeVault } from '../..'
import type { Address } from '@solana/kit'

type BuildInitializeVaultIxParams = {
  authority: any
  tokenMint: Address
  vault?: Address
  vaultTokenAccount?: Address
  vaultId?: number | bigint
  withdrawFeeBps?: number | bigint
}

export async function buildInitializeVaultInstruction(params: BuildInitializeVaultIxParams) {
  const {
    authority,
    tokenMint,
    vault,
    vaultTokenAccount,
    vaultId = 0,
    withdrawFeeBps = 0,
  } = params

  const resolvedVault = vault ?? (await pdas.deriveStakeVaultVaultPda(authority.address as Address, vaultId))
  const resolvedVaultTokenAccount = vaultTokenAccount ?? (await pdas.deriveAta(resolvedVault as Address, tokenMint))

  const ix = stakeVault.getInitializeVaultInstruction({
    authority,
    tokenMint,
    vault: resolvedVault,
    vaultTokenAccount: resolvedVaultTokenAccount,
    systemProgram: pdas.SYSTEM_PROGRAM_ID,
    tokenProgram: pdas.TOKEN_PROGRAM_ID,
    associatedTokenProgram: pdas.ASSOCIATED_TOKEN_PROGRAM_ID,
    vaultId,
    withdrawFeeBps,
  })

  return ix
}


