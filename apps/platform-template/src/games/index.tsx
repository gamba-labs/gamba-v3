import React from 'react'

export type GameMeta = {
  background: string
  name: string
  image: string
  description: string
  tag?: string
}

export type GameBundle = {
  id: string
  meta: GameMeta
  app: React.LazyExoticComponent<React.ComponentType<any>>
  props?: Record<string, any>
  metadata?: string
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
    metadata: '{"game":"flip"}',
    app: React.lazy(() => import('./Flip/Flip')),
  },
]


