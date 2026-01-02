import React from 'react'

export type GameMeta = {
  background: string
  name: string
  image: string
  description: string
  tag?: string
}

export type GameResult = {
  signature: string
  payout: bigint
  wager: bigint
  win: boolean
}

/** Props passed to game visual components */
export type GameProps = {
  result: GameResult | null
  loading: boolean
  wager: number
}

export type GameBundle = {
  id: string
  meta: GameMeta
  /** The bet array for this game (e.g. [2, 0] for 2x or nothing) */
  bet: number[]
  /** Label for the play button */
  playLabel?: string
  /** Visual component for the game */
  app: React.LazyExoticComponent<React.ComponentType<GameProps>>
}

export const GAMES: GameBundle[] = [
  {
    id: 'flip',
    meta: {
      background: '#ffe694',
      name: 'Flip',
      image: '/games/flip.png',
      description: 'Pick Heads or Tails and go 2x or 0x.',
    },
    bet: [2, 0], // 2x or 0x
    playLabel: 'Flip',
    app: React.lazy(() => import('./Flip/Flip')),
  },
]
