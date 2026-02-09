import React from 'react'
import { instructions, pdas, referral } from '@gamba/core'
import { useConnector } from '@solana/connector'
import { useGambaRpc, useSendSmartTransaction } from '@gamba/react'
import type { Address } from '@solana/kit'
import { isAddress } from '@solana/kit'
import { PLATFORM_CREATOR_ADDRESS, REFERRAL_CODE_PREFIX } from '../config/constants'

type ReferralStatus = 'none' | 'local' | 'on-chain' | 'loading'

type ReferralState = {
  referrerAddress: Address | null
  referralStatus: ReferralStatus
  referralLink: string | null
  loading: boolean
  removing: boolean
  copyInviteLink: () => Promise<void>
  removeInvite: () => Promise<string | null>
  refresh: () => Promise<void>
}

const REFERRAL_STORAGE_PREFIX = 'gamba-v3:referral'

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function getUserReferralStorageKey(creator: Address, user: Address) {
  return `${REFERRAL_STORAGE_PREFIX}:${String(creator)}:${String(user)}`
}

function getPendingReferralStorageKey(creator: Address) {
  return `${REFERRAL_STORAGE_PREFIX}:pending:${String(creator)}`
}

function getConnectedAddress(account: unknown): Address | null {
  if (!account) return null
  const raw = String((account as { address?: string }).address ?? account)
  return isAddress(raw) ? (raw as Address) : null
}

function readCachedReferrer(creator: Address, user: Address): Address | null {
  const storage = getStorage()
  if (!storage) return null

  const values = [storage.getItem(getUserReferralStorageKey(creator, user)), storage.getItem(getPendingReferralStorageKey(creator))]
  for (const value of values) {
    if (!value) continue
    if (!isAddress(value)) continue
    if (value === String(user)) continue
    return value as Address
  }

  return null
}

function clearCachedReferrer(creator: Address, user: Address) {
  const storage = getStorage()
  if (!storage) return
  storage.removeItem(getUserReferralStorageKey(creator, user))
  storage.removeItem(getPendingReferralStorageKey(creator))
}

export function useReferral(): ReferralState {
  const { account } = useConnector()
  const { rpc } = useGambaRpc()
  const { signer, send } = useSendSmartTransaction()
  const creatorAddress = PLATFORM_CREATOR_ADDRESS as Address

  const accountAddress = React.useMemo(() => getConnectedAddress(account), [account])

  const [referrerAddress, setReferrerAddress] = React.useState<Address | null>(null)
  const [referralStatus, setReferralStatus] = React.useState<ReferralStatus>('none')
  const [loading, setLoading] = React.useState(false)
  const [removing, setRemoving] = React.useState(false)

  const referralLink = React.useMemo(() => {
    if (!accountAddress || typeof window === 'undefined') return null
    return `${window.location.origin}?${REFERRAL_CODE_PREFIX}=${accountAddress}`
  }, [accountAddress])

  const refresh = React.useCallback(async () => {
    if (!accountAddress) {
      setReferrerAddress(null)
      setReferralStatus('none')
      return
    }

    setLoading(true)
    setReferralStatus('loading')

    try {
      const referAccount = await pdas.deriveReferralAccountPda(creatorAddress, accountAddress)
      const onChainRefer = await referral.fetchMaybeReferAccount(rpc, referAccount)
      const onChainReferrer = onChainRefer.exists && onChainRefer.data?.referrer ? String(onChainRefer.data.referrer) : null

      if (onChainReferrer && isAddress(onChainReferrer) && onChainReferrer !== accountAddress) {
        const storage = getStorage()
        if (storage) {
          storage.setItem(getUserReferralStorageKey(creatorAddress, accountAddress), onChainReferrer)
          storage.removeItem(getPendingReferralStorageKey(creatorAddress))
        }
        setReferrerAddress(onChainReferrer as Address)
        setReferralStatus('on-chain')
        return
      }
    } catch {
      // Fall through to local cache lookup.
    } finally {
      setLoading(false)
    }

    const cached = readCachedReferrer(creatorAddress, accountAddress)
    setReferrerAddress(cached)
    setReferralStatus(cached ? 'local' : 'none')
  }, [accountAddress, creatorAddress, rpc])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  const copyInviteLink = React.useCallback(async () => {
    if (!referralLink) {
      throw new Error('Wallet not connected')
    }
    if (typeof navigator === 'undefined' || !navigator.clipboard) {
      throw new Error('Clipboard API not available')
    }
    await navigator.clipboard.writeText(referralLink)
  }, [referralLink])

  const removeInvite = React.useCallback(async () => {
    if (!accountAddress) throw new Error('Wallet not connected')
    setRemoving(true)

    try {
      const referAccount = await pdas.deriveReferralAccountPda(creatorAddress, accountAddress)
      const maybeRefer = await referral.fetchMaybeReferAccount(rpc, referAccount)

      let signature: string | null = null
      if (maybeRefer.exists) {
        if (!signer) {
          throw new Error('Wallet signer unavailable')
        }
        const ix = await instructions.referral.buildCloseReferAccountInstruction({
          authority: signer,
          creator: creatorAddress,
          referAccount,
        })
        signature = await send([ix as any])
      }

      clearCachedReferrer(creatorAddress, accountAddress)
      setReferrerAddress(null)
      setReferralStatus('none')

      return signature
    } finally {
      setRemoving(false)
    }
  }, [accountAddress, creatorAddress, rpc, send, signer])

  return {
    referrerAddress,
    referralStatus,
    referralLink,
    loading,
    removing,
    copyInviteLink,
    removeInvite,
    refresh,
  }
}
