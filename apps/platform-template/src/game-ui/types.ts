import type React from 'react'
import type { PlayPhase } from '../hooks/useGambaPlay'

export const BPS_PER_WHOLE = 10000

export type GameBundle = {
  id: string
  app: React.ComponentType<any> | React.LazyExoticComponent<React.ComponentType<any>>
  meta: {
    background: string
    name: string
    image: string
    description: string
    tag?: string
  }
  props?: Record<string, unknown>
}

export type PlayInput = {
  wager: number
  bet: number[]
  metadata?: Array<string | number> | string
}

export type GameResult = {
  signature: string
  settled: boolean
  payout: number
  wager: number
  profit: number
  multiplier: number
  multiplierBps: number
  resultIndex: number
  token: string
  win: boolean
}

export type GameRuntimeValue = {
  game: GameBundle
  phase: PlayPhase
  isPlaying: boolean
  play: (input: PlayInput) => Promise<GameResult>
  result: () => Promise<GameResult>
}
