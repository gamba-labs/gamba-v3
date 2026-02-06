import React from 'react'
import { useConnector } from '@solana/connector'
import { instructions, core, pdas } from '@gamba/core'
import { useToken } from '../providers/TokenContext'
import type { Address } from '@solana/kit'
import { createSolanaRpcSubscriptions } from '@solana/kit'
import { useGambaRpc, useSendSmartTransaction } from '@gamba/react'

type Game = ReturnType<typeof core.getGameDecoder> extends infer D
  ? D extends { decode: (u8: Uint8Array) => infer T } ? T : never
  : never

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

  const play = React.useCallback(async (bet: number[] | string, options?: PlayOptions): Promise<PlayResult> => {
    try {
      if (!isConnected || !signer) throw new Error('Wallet not connected')
      if (!selectedPool?.poolAddress || !selectedPool.underlyingTokenMint) throw new Error('Select a token/pool')

      const userAddress = signer.address as Address
      const betArray = Array.isArray(bet)
        ? bet
        : String(bet).split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n))
      // Convert [2,0] -> [20000,0] (bps: 10000 = 1x)
      const betBps = betArray.map((x) => Math.round(Number(x) * 10000))

      // Get the user's Game PDA
      const gameAddress = await pdas.deriveGamePda(userAddress)
      
      // Get current nonce BEFORE playing
      const gameBeforePlay = await fetchGameAccount(rpc, gameAddress)
      const prevNonce = gameBeforePlay?.nonce ?? 0n
      console.log('[useGambaPlay] Game address:', gameAddress)
      console.log('[useGambaPlay] Previous nonce:', prevNonce)

      // Set up WebSocket subscription to watch Game account BEFORE sending
      const rpcSubs = createSolanaRpcSubscriptions(wsUrl)
      const abortController = new AbortController()

      // Promise that resolves when nonce increments (game settled)
      const resultPromise = new Promise<Game | null>((resolve) => {
        const timeout = setTimeout(() => {
          console.log('[useGambaPlay] Timeout waiting for nonce change')
          abortController.abort()
          resolve(null)
        }, 30000) // 30s timeout

        ;(async () => {
          try {
            const notifications = await rpcSubs.accountNotifications(
              gameAddress,
              { commitment: 'confirmed', encoding: 'base64' }
            ).subscribe({ abortSignal: abortController.signal })

            for await (const notification of notifications) {
              try {
                const data = (notification.value as any)?.data
                if (!data) continue
                const [b64] = Array.isArray(data) ? data : [data]
                if (typeof b64 !== 'string') continue
                const bytes = base64ToBytes(b64)
                const game = core.getGameDecoder().decode(bytes) as Game
                
                console.log('[useGambaPlay] Game account updated, nonce:', game.nonce)
                
                // Check if nonce incremented
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

      // Build and send the play instruction
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

      console.log('[useGambaPlay] Sending transaction...')
      const signature = await send([ix])
      console.log('[useGambaPlay] Transaction sent:', signature)
      console.log('[useGambaPlay] Waiting for game account nonce to increment...')

      // Wait for the result
      const settledGame = await resultPromise

      if (settledGame) {
        // Calculate payout from bet[result] * wager
        const resultIndex = Number(settledGame.result)
        const betValue = settledGame.bet[resultIndex] ?? 0 // in bps (10000 = 1x)
        const wager = settledGame.wager
        const payout = (wager * BigInt(betValue)) / 10000n
        const win = payout > 0n

        console.log('[useGambaPlay] Result:', { resultIndex, betValue, wager, payout, win })

        return {
          signature,
          payout,
          wager,
          multiplierBps: betValue,
          win,
          settled: true,
        }
      }

      // Fallback: try RPC fetch
      console.log('[useGambaPlay] WebSocket timeout, trying RPC fallback...')
      const gameAfterPlay = await fetchGameAccount(rpc, gameAddress)
      if (gameAfterPlay && gameAfterPlay.nonce > prevNonce) {
        const resultIndex = Number(gameAfterPlay.result)
        const betValue = gameAfterPlay.bet[resultIndex] ?? 0
        const wager = gameAfterPlay.wager
        const payout = (wager * BigInt(betValue)) / 10000n
        const win = payout > 0n

        return {
          signature,
          payout,
          wager,
          multiplierBps: betValue,
          win,
          settled: true,
        }
      }

      return { signature, settled: false }
    } catch (e) {
      console.error('[useGambaPlay] Error:', e)
      return { error: e }
    }
  }, [rpc, wsUrl, isConnected, selectedPool, send, signer])

  return { play }
}
