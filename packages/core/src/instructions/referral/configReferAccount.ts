import { referral, pdas } from '../..'
import type { Address } from '@solana/kit'

type BuildConfigReferAccountIxParams = {
  authority: any
  referrer: Address
  creator: Address
  referAccount?: Address
}

export async function buildConfigReferAccountInstruction(params: BuildConfigReferAccountIxParams) {
  const { authority, referrer, creator } = params
  const referAccount = params.referAccount ?? (await pdas.deriveReferralAccountPda(creator, authority.address as Address))

  const ix = referral.getConfigReferAccountInstruction({
    authority,
    referAccount,
    creator,
    systemProgram: pdas.SYSTEM_PROGRAM_ID,
    referrer,
  })

  return ix
}


