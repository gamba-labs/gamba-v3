import { NATIVE_MINT } from '@/constants'
import { pdas } from '@gamba/core'
import { useGambaRpc } from '@gamba/react'
import type { Address } from '@solana/kit'
import React from 'react'
import useSWR from 'swr'
import { useWalletAddress } from './useWalletAddress'

const SWR_NO_BACKGROUND_REFRESH = {
  refreshWhenHidden: false,
  refreshWhenOffline: false,
  revalidateOnFocus: false,
} as const

export interface ParsedTokenAccount {
  mint: string
  amount: bigint
  decimals: number
  ata?: string
}

function parseParsedTokenAccount(value: any): ParsedTokenAccount | null {
  const info = value?.account?.data?.parsed?.info
  const mint = String(info?.mint ?? '')
  const amount = info?.tokenAmount?.amount
  const decimals = Number(info?.tokenAmount?.decimals ?? 0)
  const ata = String(value?.pubkey ?? '')

  if (!mint || typeof amount !== 'string') return null

  return {
    mint,
    amount: BigInt(amount),
    decimals,
    ata: ata || undefined,
  }
}

async function fetchTokenAccountsByOwner(rpc: ReturnType<typeof useGambaRpc>['rpc'], owner: string) {
  const response = await rpc
    .getTokenAccountsByOwner(
      owner as Address,
      { programId: pdas.TOKEN_PROGRAM_ID },
      { encoding: 'jsonParsed' },
    )
    .send()

  const parsed = (response?.value ?? [])
    .map(parseParsedTokenAccount)
    .filter((x): x is ParsedTokenAccount => !!x)

  return parsed.sort((a, b) => {
    if (a.amount === b.amount) return a.mint > b.mint ? 1 : -1
    return a.amount > b.amount ? -1 : 1
  })
}

export function useNativeBalance(owner?: string | null) {
  const walletAddress = useWalletAddress()
  const address = owner ?? walletAddress
  const { rpc } = useGambaRpc()

  const { data = 0n, isLoading, mutate } = useSWR(
    address ? `native-balance-${address}` : null,
    async () => {
      const response = await rpc.getBalance(address as Address).send()
      return BigInt((response as any)?.value ?? 0)
    },
    { ...SWR_NO_BACKGROUND_REFRESH, refreshInterval: 15_000 },
  )

  return {
    balance: data,
    isLoading,
    refetch: () => mutate(),
  }
}

/**
 * Returns token accounts owned by `owner`.
 */
export function useTokenAccountsByOwner(owner?: string | null) {
  const { rpc } = useGambaRpc()

  const { data = [], isLoading, mutate } = useSWR(
    owner ? `token-accounts-${owner}` : null,
    async () => fetchTokenAccountsByOwner(rpc, owner!),
    { ...SWR_NO_BACKGROUND_REFRESH, refreshInterval: 30_000 },
  )

  return {
    accounts: data,
    isLoading,
    refetch: () => mutate(),
  }
}

/**
 * Always includes native SOL as a pseudo token account.
 */
export function useTokenList(owner?: string | null) {
  const walletAddress = useWalletAddress()
  const address = owner ?? walletAddress
  const native = useNativeBalance(address)
  const tokens = useTokenAccountsByOwner(address)

  return React.useMemo(() => {
    const nativeToken: ParsedTokenAccount = {
      mint: NATIVE_MINT,
      amount: native.balance,
      decimals: 9,
    }

    const filtered = tokens.accounts.filter((t) => t.mint !== NATIVE_MINT)

    return {
      tokens: [nativeToken, ...filtered],
      isLoading: native.isLoading || tokens.isLoading,
      refetch: async () => {
        await Promise.all([native.refetch(), tokens.refetch()])
      },
    }
  }, [native.balance, native.isLoading, native.refetch, tokens.accounts, tokens.isLoading, tokens.refetch])
}

function readAmountFromTokenBalanceResponse(value: any): bigint {
  const amount = value?.value?.amount
  if (typeof amount === 'string') return BigInt(amount)
  return 0n
}

export function useBalance(mint: string, authority?: string | null) {
  const { rpc } = useGambaRpc()
  const walletAddress = useWalletAddress()

  const key = walletAddress ? `balance-${walletAddress}-${mint}-${authority ?? 'none'}` : null

  const { data, isLoading, mutate } = useSWR(
    key,
    async () => {
      if (!walletAddress) {
        return {
          balance: 0n,
          bonusBalance: 0n,
          lpBalance: 0n,
        }
      }

      const isNativeMint = mint === NATIVE_MINT

      let balance = 0n
      if (isNativeMint) {
        const res = await rpc.getBalance(walletAddress as Address).send()
        balance = BigInt((res as any)?.value ?? 0)
      } else {
        try {
          const userAta = await pdas.deriveAta(walletAddress as Address, mint as Address)
          const res = await rpc.getTokenAccountBalance(userAta).send()
          balance = readAmountFromTokenBalanceResponse(res)
        } catch {
          balance = 0n
        }
      }

      let bonusBalance = 0n
      let lpBalance = 0n

      if (authority) {
        try {
          const pool = await pdas.derivePoolPda(mint as Address, authority as Address)
          const lpMint = await pdas.derivePoolLpMintPda(pool)
          const bonusMint = await pdas.derivePoolBonusMintPda(pool)

          const [userLpAta, userBonusAta] = await Promise.all([
            pdas.deriveAta(walletAddress as Address, lpMint),
            pdas.deriveAta(walletAddress as Address, bonusMint),
          ])

          try {
            const lpRes = await rpc.getTokenAccountBalance(userLpAta).send()
            lpBalance = readAmountFromTokenBalanceResponse(lpRes)
          } catch {
            lpBalance = 0n
          }

          try {
            const bonusRes = await rpc.getTokenAccountBalance(userBonusAta).send()
            bonusBalance = readAmountFromTokenBalanceResponse(bonusRes)
          } catch {
            bonusBalance = 0n
          }
        } catch {
          bonusBalance = 0n
          lpBalance = 0n
        }
      }

      return { balance, bonusBalance, lpBalance }
    },
    { ...SWR_NO_BACKGROUND_REFRESH, refreshInterval: 20_000 },
  )

  return {
    balance: data?.balance ?? 0n,
    bonusBalance: data?.bonusBalance ?? 0n,
    lpBalance: data?.lpBalance ?? 0n,
    isLoading,
    refetch: () => mutate(),
  }
}
