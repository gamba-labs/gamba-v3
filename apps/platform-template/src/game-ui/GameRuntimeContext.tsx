import React from 'react'
import { useToken } from '../providers/TokenContext'
import { useGambaPlay, type PlayPhase } from '../hooks/useGambaPlay'
import type { GameBundle, GameResult, GameRuntimeValue, PlayInput } from './types'

type GameRuntimeProviderProps = React.PropsWithChildren<{ game: GameBundle }>

const GameRuntimeContext = React.createContext<GameRuntimeValue | null>(null)

function toSafeNumber(value: bigint | number): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  const max = BigInt(Number.MAX_SAFE_INTEGER)
  if (value > max) return Number.MAX_SAFE_INTEGER
  if (value < -max) return Number.MIN_SAFE_INTEGER
  return Number(value)
}

export function GameRuntimeProvider({ game, children }: GameRuntimeProviderProps) {
  const { play: playTx } = useGambaPlay()
  const { selectedPool } = useToken()

  const [phase, setPhase] = React.useState<PlayPhase>('idle')
  const [isPlaying, setIsPlaying] = React.useState(false)

  const lastResultRef = React.useRef<GameResult | null>(null)
  const pendingResultRef = React.useRef<Promise<GameResult> | null>(null)
  const resolveResultRef = React.useRef<((result: GameResult) => void) | null>(null)
  const rejectResultRef = React.useRef<((error: unknown) => void) | null>(null)

  const createPendingResult = React.useCallback(() => {
    const promise = new Promise<GameResult>((resolve, reject) => {
      resolveResultRef.current = resolve
      rejectResultRef.current = reject
    })
    pendingResultRef.current = promise
    return promise
  }, [])

  const play = React.useCallback(
    async (input: PlayInput) => {
      if (isPlaying) {
        throw new Error('A game is already in progress')
      }

      setIsPlaying(true)
      setPhase('signing')
      createPendingResult()

      try {
        const args = typeof input.metadata === 'string' ? [input.metadata] : input.metadata ?? []
        const metadata = JSON.stringify({ gameId: game.id, args })

        const response = await playTx(input.bet, {
          wager: input.wager,
          metadata,
          onPhase: setPhase,
        })

        if ('error' in response) {
          throw response.error
        }

        const wager = 'wager' in response ? toSafeNumber(response.wager) : input.wager
        const payout = 'payout' in response ? toSafeNumber(response.payout) : 0
        const multiplierBps = 'multiplierBps' in response ? response.multiplierBps : 0
        const resultIndex = 'resultIndex' in response ? response.resultIndex : 0

        const normalized: GameResult = {
          signature: response.signature,
          settled: response.settled,
          payout,
          wager,
          profit: payout - wager,
          multiplier: multiplierBps / 10000,
          multiplierBps,
          resultIndex,
          token: String(selectedPool?.underlyingTokenMint ?? selectedPool?.token?.mint ?? ''),
          win: payout > 0,
        }

        lastResultRef.current = normalized
        resolveResultRef.current?.(normalized)

        pendingResultRef.current = null
        resolveResultRef.current = null
        rejectResultRef.current = null

        return normalized
      } catch (error) {
        setPhase('error')
        rejectResultRef.current?.(error)

        pendingResultRef.current = null
        resolveResultRef.current = null
        rejectResultRef.current = null

        throw error
      } finally {
        setIsPlaying(false)
      }
    },
    [createPendingResult, game.id, isPlaying, playTx, selectedPool?.token?.mint, selectedPool?.underlyingTokenMint],
  )

  const result = React.useCallback(async () => {
    if (lastResultRef.current) {
      return lastResultRef.current
    }
    if (pendingResultRef.current) {
      return pendingResultRef.current
    }
    throw new Error('No game result available')
  }, [])

  const value = React.useMemo<GameRuntimeValue>(
    () => ({
      game,
      phase,
      isPlaying,
      play,
      result,
    }),
    [game, isPlaying, phase, play, result],
  )

  return <GameRuntimeContext.Provider value={value}>{children}</GameRuntimeContext.Provider>
}

export function useGameRuntime() {
  const context = React.useContext(GameRuntimeContext)
  if (!context) throw new Error('useGameRuntime must be used within GameRuntimeProvider')
  return context
}

export function useGamba() {
  const context = useGameRuntime()
  return React.useMemo(
    () => ({
      isPlaying: context.isPlaying,
      phase: context.phase,
    }),
    [context.isPlaying, context.phase],
  )
}

export function useGame() {
  const context = useGameRuntime()
  return React.useMemo(
    () => ({
      game: context.game,
      play: context.play,
      result: context.result,
    }),
    [context.game, context.play, context.result],
  )
}
