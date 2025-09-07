import { referral, pdas } from '../..'
import type { Address } from '@solana/kit'

type BuildCloseReferAccountIxParams = {
  authority: any
  referAccount?: Address
  creator: Address
}

export async function buildCloseReferAccountInstruction(params: BuildCloseReferAccountIxParams) {
  const { authority, creator } = params
  const referAccount = params.referAccount ?? (await pdas.deriveReferralAccountPda(creator, authority.address as Address))

  const ix = referral.getCloseReferAccountInstruction({
    authority,
    referAccount,
    creator,
    systemProgram: pdas.SYSTEM_PROGRAM_ID,
  })

  return ix
}


