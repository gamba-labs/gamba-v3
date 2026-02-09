import React from 'react'
import { useConnector } from '@solana/connector'
import { instructions, core, pdas, referral } from '@gamba/core'
import { useToken } from '../providers/TokenContext'
import type { Address, Instruction } from '@solana/kit'
import { AccountRole, createSolanaRpcSubscriptions, isAddress } from '@solana/kit'
import { useGambaRpc, useSendSmartTransaction } from '@gamba/react'
import {
  PLATFORM_CREATOR_ADDRESS,
  PLATFORM_CREATOR_FEE_BPS,
  PLATFORM_REFERRAL_FEE_BPS,
  REFERRAL_CODE_PREFIX,
} from '../config/constants'

type Game = ReturnType<typeof core.getGameDecoder> extends infer D
  ? D extends { decode: (u8: Uint8Array) => infer T }
    ? T
    : never
  : never

export type PlayPhase = 'idle' | 'signing' | 'sending' | 'settling' | 'finished' | 'error'

export type PlayResult =
  | {
      signature: string
      payout: bigint
      wager: bigint
      multiplierBps: number
      resultIndex: number
      win: boolean
      settled: true
    }
  | { signature: string; settled: false }
  | { error: unknown }

type PlayOptions = {
  wager?: number | bigint
  clientSeed?: string
  metadata?: string
  creatorFeeBps?: number
  jackpotFeeBps?: number
  onPhase?: (phase: PlayPhase) => void
}

type ReferralResolution = {
  referrer: Address | null
  isOnChain: boolean
  referAccount: Address
}

const NATIVE_MINT = 'So11111111111111111111111111111111111111112'
const REFERRAL_STORAGE_PREFIX = 'gamba-v3:referral'

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function encodeU64LE(value: bigint): Uint8Array {
  const out = new Uint8Array(8)
  let n = value
  for (let i = 0; i < 8; i++) {
    out[i] = Number(n & 0xffn)
    n >>= 8n
  }
  return out
}

function toBigIntAmount(value: number | bigint): bigint {
  if (typeof value === 'bigint') return value
  if (!Number.isFinite(value)) return 0n
  return BigInt(Math.max(0, Math.round(value)))
}

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

function captureReferralCodeFromUrl(prefix: string): Address | null {
  if (typeof window === 'undefined') return null

  const url = new URL(window.location.href)
  const raw = url.searchParams.get(prefix)
  if (!raw || !isAddress(raw)) return null

  url.searchParams.delete(prefix)
  const cleaned = `${url.pathname}${url.search}${url.hash}`
  window.history.replaceState({}, document.title, cleaned)

  return raw as Address
}

async function fetchGameAccount(rpc: any, gameAddress: Address): Promise<Game | null> {
  try {
    const res = await rpc.getAccountInfo(gameAddress, { encoding: 'base64' }).send()
    if (!res?.value?.data) return null
    const [b64] = res.value.data as [string, string]
    const bytes = base64ToBytes(b64)
    return core.getGameDecoder().decode(bytes) as Game
  } catch {
    return null
  }
}

function buildSystemTransferInstruction(from: Address, to: Address, amount: bigint): Instruction<Address> {
  const data = new Uint8Array(12)
  data[0] = 2 // SystemInstruction::Transfer
  data.set(encodeU64LE(amount), 4)

  return {
    programAddress: pdas.SYSTEM_PROGRAM_ID,
    accounts: [
      { address: from, role: AccountRole.WRITABLE_SIGNER },
      { address: to, role: AccountRole.WRITABLE },
    ],
    data,
  }
}

function buildCreateAtaInstruction(payer: Address, ata: Address, owner: Address, mint: Address): Instruction<Address> {
  return {
    programAddress: pdas.ASSOCIATED_TOKEN_PROGRAM_ID,
    accounts: [
      { address: payer, role: AccountRole.WRITABLE_SIGNER },
      { address: ata, role: AccountRole.WRITABLE },
      { address: owner, role: AccountRole.READONLY },
      { address: mint, role: AccountRole.READONLY },
      { address: pdas.SYSTEM_PROGRAM_ID, role: AccountRole.READONLY },
      { address: pdas.TOKEN_PROGRAM_ID, role: AccountRole.READONLY },
    ],
    data: new Uint8Array(0),
  }
}

function buildSplTransferInstruction(sourceAta: Address, destinationAta: Address, owner: Address, amount: bigint): Instruction<Address> {
  const data = new Uint8Array(9)
  data[0] = 3 // TokenInstruction::Transfer
  data.set(encodeU64LE(amount), 1)

  return {
    programAddress: pdas.TOKEN_PROGRAM_ID,
    accounts: [
      { address: sourceAta, role: AccountRole.WRITABLE },
      { address: destinationAta, role: AccountRole.WRITABLE },
      { address: owner, role: AccountRole.READONLY_SIGNER },
    ],
    data,
  }
}

async function resolveReferral(params: {
  rpc: any
  userAddress: Address
  creatorAddress: Address
  prefix: string
}): Promise<ReferralResolution> {
  const { rpc, userAddress, creatorAddress, prefix } = params

  const storage = getStorage()
  const userReferralKey = getUserReferralStorageKey(creatorAddress, userAddress)
  const pendingReferralKey = getPendingReferralStorageKey(creatorAddress)

  const urlReferrer = captureReferralCodeFromUrl(prefix)
  if (storage && urlReferrer && urlReferrer !== userAddress) {
    storage.setItem(pendingReferralKey, urlReferrer)
  }

  const referAccount = await pdas.deriveReferralAccountPda(creatorAddress, userAddress)

  try {
    const maybeRefer = await referral.fetchMaybeReferAccount(rpc, referAccount)
    if (maybeRefer.exists && maybeRefer.data?.referrer) {
      const onChainReferrer = String(maybeRefer.data.referrer)
      if (isAddress(onChainReferrer) && onChainReferrer !== userAddress) {
        if (storage) {
          storage.setItem(userReferralKey, onChainReferrer)
          storage.removeItem(pendingReferralKey)
        }
        return {
          referrer: onChainReferrer as Address,
          isOnChain: true,
          referAccount,
        }
      }
    }
  } catch {
    // If read fails, fall back to local cache.
  }

  const cachedUserReferrer = storage?.getItem(userReferralKey)
  if (cachedUserReferrer && isAddress(cachedUserReferrer) && cachedUserReferrer !== userAddress) {
    return {
      referrer: cachedUserReferrer as Address,
      isOnChain: false,
      referAccount,
    }
  }

  const pendingReferrer = storage?.getItem(pendingReferralKey)
  if (pendingReferrer && isAddress(pendingReferrer) && pendingReferrer !== userAddress) {
    if (storage) {
      storage.setItem(userReferralKey, pendingReferrer)
      storage.removeItem(pendingReferralKey)
    }
    return {
      referrer: pendingReferrer as Address,
      isOnChain: false,
      referAccount,
    }
  }

  return {
    referrer: null,
    isOnChain: false,
    referAccount,
  }
}

async function buildReferralTransferInstructions(params: {
  rpc: any
  userAddress: Address
  referrerAddress: Address
  mint: Address
  amount: bigint
}): Promise<Instruction<Address>[]> {
  const { rpc, userAddress, referrerAddress, mint, amount } = params

  if (amount <= 0n) return []

  if (String(mint) === NATIVE_MINT) {
    return [buildSystemTransferInstruction(userAddress, referrerAddress, amount)]
  }

  const sourceAta = await pdas.deriveAta(userAddress, mint)
  const destinationAta = await pdas.deriveAta(referrerAddress, mint)

  let destinationExists = false
  try {
    const info = await rpc.getAccountInfo(destinationAta, { encoding: 'base64' }).send()
    destinationExists = Boolean(info?.value)
  } catch {
    destinationExists = false
  }

  const ixs: Instruction<Address>[] = []

  if (!destinationExists) {
    ixs.push(buildCreateAtaInstruction(userAddress, destinationAta, referrerAddress, mint))
  }

  ixs.push(buildSplTransferInstruction(sourceAta, destinationAta, userAddress, amount))

  return ixs
}

export function useGambaPlay() {
  const { rpc, wsUrl } = useGambaRpc()
  const { isConnected } = useConnector()
  const { selectedPool } = useToken()
  const { send, signer } = useSendSmartTransaction()

  const play = React.useCallback(
    async (bet: number[] | string, options?: PlayOptions): Promise<PlayResult> => {
      const emitPhase = (phase: PlayPhase) => {
        try {
          options?.onPhase?.(phase)
        } catch {}
      }

      try {
        if (!isConnected || !signer) throw new Error('Wallet not connected')
        if (!selectedPool?.poolAddress || !selectedPool.underlyingTokenMint) throw new Error('Select a token/pool')

        emitPhase('signing')

        const userAddress = signer.address as Address
        const creatorAddress = PLATFORM_CREATOR_ADDRESS as Address
        const wager = toBigIntAmount(options?.wager ?? 0)

        const betArray = Array.isArray(bet)
          ? bet
          : String(bet)
              .split(',')
              .map((s) => Number(s.trim()))
              .filter((n) => Number.isFinite(n))

        if (betArray.length === 0) {
          throw new Error('Invalid bet: outcome array is empty')
        }
        if (betArray.some((value) => value < 0)) {
          throw new Error('Invalid bet: negative outcome value')
        }

        // Gamba outcome arrays represent multipliers per outcome. Sum must not exceed outcome count.
        const betSum = betArray.reduce((acc, value) => acc + value, 0)
        if (betSum > betArray.length + 1e-9) {
          throw new Error(`Invalid bet: sum(${betSum}) cannot exceed outcomes(${betArray.length})`)
        }

        const betBps = betArray.map((x) => Math.round(Number(x) * 10000))

        const gameAddress = await pdas.deriveGamePda(userAddress)

        const gameBeforePlay = await fetchGameAccount(rpc, gameAddress)
        const prevNonce = gameBeforePlay?.nonce ?? 0n
        console.log('[useGambaPlay] Game address:', gameAddress)
        console.log('[useGambaPlay] Previous nonce:', prevNonce)

        const rpcSubs = createSolanaRpcSubscriptions(wsUrl)
        const abortController = new AbortController()

        const resultPromise = new Promise<Game | null>((resolve) => {
          const timeout = setTimeout(() => {
            console.log('[useGambaPlay] Timeout waiting for nonce change')
            abortController.abort()
            resolve(null)
          }, 30000)

          ;(async () => {
            try {
              const notifications = await rpcSubs
                .accountNotifications(gameAddress, { commitment: 'confirmed', encoding: 'base64' })
                .subscribe({ abortSignal: abortController.signal })

              for await (const notification of notifications) {
                try {
                  const data = (notification.value as any)?.data
                  if (!data) continue
                  const [b64] = Array.isArray(data) ? data : [data]
                  if (typeof b64 !== 'string') continue
                  const bytes = base64ToBytes(b64)
                  const game = core.getGameDecoder().decode(bytes) as Game

                  console.log('[useGambaPlay] Game account updated, nonce:', game.nonce)

                  if (game.nonce > prevNonce) {
                    console.log('[useGambaPlay] Nonce incremented! Game settled.')
                    clearTimeout(timeout)
                    abortController.abort()
                    resolve(game)
                    return
                  }
                } catch (e) {
                  console.warn('[useGambaPlay] Failed to decode game account:', e)
                }
              }
            } catch {
              // Subscription ended or aborted
            }
            resolve(null)
          })()
        })

        const prePlayInstructions: Instruction<Address>[] = []
        let effectiveCreatorFeeBps = options?.creatorFeeBps ?? PLATFORM_CREATOR_FEE_BPS

        const referralResolution = await resolveReferral({
          rpc,
          userAddress,
          creatorAddress,
          prefix: REFERRAL_CODE_PREFIX,
        })

        if (referralResolution.referrer && referralResolution.referrer !== userAddress) {
          if (!referralResolution.isOnChain) {
            const configReferralIx = await instructions.referral.buildConfigReferAccountInstruction({
              authority: signer as unknown as any,
              creator: creatorAddress,
              referrer: referralResolution.referrer,
              referAccount: referralResolution.referAccount,
            })
            prePlayInstructions.push(configReferralIx as unknown as Instruction<Address>)
          }

          const referralFeeBps = Math.min(Math.max(PLATFORM_REFERRAL_FEE_BPS, 0), Math.max(effectiveCreatorFeeBps, 0))
          const referralAmount = (wager * BigInt(referralFeeBps)) / 10000n

          if (referralAmount > 0n) {
            const referralTransferInstructions = await buildReferralTransferInstructions({
              rpc,
              userAddress,
              referrerAddress: referralResolution.referrer,
              mint: selectedPool.underlyingTokenMint,
              amount: referralAmount,
            })
            prePlayInstructions.push(...referralTransferInstructions)
          }

          effectiveCreatorFeeBps = Math.max(0, effectiveCreatorFeeBps - referralFeeBps)
        }

        const ix = await instructions.singleplayer.buildPlayGameInstruction({
          user: signer as unknown as any,
          pool: selectedPool.poolAddress as Address,
          wager,
          bet: betBps,
          clientSeed: options?.clientSeed ?? 'seed',
          metadata: options?.metadata ?? '{}',
          creator: creatorAddress,
          creatorFeeBps: effectiveCreatorFeeBps,
          jackpotFeeBps: options?.jackpotFeeBps ?? 0,
          rpc,
        })

        emitPhase('sending')

        console.log('[useGambaPlay] Sending transaction...')
        const signature = await send([...prePlayInstructions, ix as unknown as Instruction<Address>])
        console.log('[useGambaPlay] Transaction sent:', signature)
        console.log('[useGambaPlay] Waiting for game account nonce to increment...')

        emitPhase('settling')

        const settledGame = await resultPromise

        if (settledGame) {
          const resultIndex = Number(settledGame.result)
          const betValue = settledGame.bet[resultIndex] ?? 0
          const settledWager = settledGame.wager
          const payout = (settledWager * BigInt(betValue)) / 10000n
          const win = payout > 0n

          console.log('[useGambaPlay] Result:', { resultIndex, betValue, wager: settledWager, payout, win })

          emitPhase('finished')

          return {
            signature,
            payout,
            wager: settledWager,
            multiplierBps: betValue,
            resultIndex,
            win,
            settled: true,
          }
        }

        console.log('[useGambaPlay] WebSocket timeout, trying RPC fallback...')
        const gameAfterPlay = await fetchGameAccount(rpc, gameAddress)
        if (gameAfterPlay && gameAfterPlay.nonce > prevNonce) {
          const resultIndex = Number(gameAfterPlay.result)
          const betValue = gameAfterPlay.bet[resultIndex] ?? 0
          const settledWager = gameAfterPlay.wager
          const payout = (settledWager * BigInt(betValue)) / 10000n
          const win = payout > 0n

          emitPhase('finished')

          return {
            signature,
            payout,
            wager: settledWager,
            multiplierBps: betValue,
            resultIndex,
            win,
            settled: true,
          }
        }

        emitPhase('finished')
        return { signature, settled: false }
      } catch (e) {
        emitPhase('error')
        console.error('[useGambaPlay] Error:', e)
        return { error: e }
      }
    },
    [rpc, wsUrl, isConnected, selectedPool, send, signer],
  )

  return { play }
}
