import React from 'react'
import { useConnector } from '@solana/connector'
import { instructions, core, pdas } from '@gamba/core'
import { useToken } from '../providers/TokenContext'
import type { Address } from '@solana/kit'
import { createSolanaRpcSubscriptions } from '@solana/kit'
import { useGambaRpc, useSendSmartTransaction } from '@gamba/react'

type Game = ReturnType<typeof core.getGameDecoder> extends infer D
  ? D extends { decode: (u8: Uint8Array) => infer T }
    ? T
    : never
  : never

export type PlayPhase = 'idle' | 'signing' | 'sending' | 'settling' | 'finished' | 'error'

export type PlayResult =
  | { signature: string; payout: bigint; wager: bigint; multiplierBps: number; win: boolean; settled: true }
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

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
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
        const betArray = Array.isArray(bet)
          ? bet
          : String(bet)
              .split(',')
              .map((s) => Number(s.trim()))
              .filter((n) => Number.isFinite(n))
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

        const ix = await instructions.singleplayer.buildPlayGameInstruction({
          user: signer as unknown as any,
          pool: selectedPool.poolAddress as Address,
          wager: options?.wager ?? 0,
          bet: betBps,
          clientSeed: options?.clientSeed ?? 'seed',
          metadata: options?.metadata ?? '{}',
          creatorFeeBps: options?.creatorFeeBps ?? 0,
          jackpotFeeBps: options?.jackpotFeeBps ?? 0,
          rpc,
        })

        emitPhase('sending')

        console.log('[useGambaPlay] Sending transaction...')
        const signature = await send([ix])
        console.log('[useGambaPlay] Transaction sent:', signature)
        console.log('[useGambaPlay] Waiting for game account nonce to increment...')

        emitPhase('settling')

        const settledGame = await resultPromise

        if (settledGame) {
          const resultIndex = Number(settledGame.result)
          const betValue = settledGame.bet[resultIndex] ?? 0
          const wager = settledGame.wager
          const payout = (wager * BigInt(betValue)) / 10000n
          const win = payout > 0n

          console.log('[useGambaPlay] Result:', { resultIndex, betValue, wager, payout, win })

          emitPhase('finished')

          return {
            signature,
            payout,
            wager,
            multiplierBps: betValue,
            win,
            settled: true,
          }
        }

        console.log('[useGambaPlay] WebSocket timeout, trying RPC fallback...')
        const gameAfterPlay = await fetchGameAccount(rpc, gameAddress)
        if (gameAfterPlay && gameAfterPlay.nonce > prevNonce) {
          const resultIndex = Number(gameAfterPlay.result)
          const betValue = gameAfterPlay.bet[resultIndex] ?? 0
          const wager = gameAfterPlay.wager
          const payout = (wager * BigInt(betValue)) / 10000n
          const win = payout > 0n

          emitPhase('finished')

          return {
            signature,
            payout,
            wager,
            multiplierBps: betValue,
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
