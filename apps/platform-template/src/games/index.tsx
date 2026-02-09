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
  props?: Record<string, unknown>
  app: React.LazyExoticComponent<React.ComponentType<any>>
}

export const GAMES: GameBundle[] = [
  {
    id: 'dice',
    meta: {
      background: '#ff6490',
      name: 'Dice',
      image: '/games/dice.png',
      description:
        'Dice challenges players to predict the outcome of a roll with a unique twist. Select a number and aim to roll below it to win. Adjusting your choice affects potential payouts, balancing risk and reward for an engaging experience.',
    },
    app: React.lazy(() => import('./Dice')),
  },
  {
    id: 'slots',
    meta: {
      background: '#5465ff',
      name: 'Slots',
      image: '/games/slots.png',
      description:
        'Slots is the quintessential game of luck and anticipation. Spin the reels and match symbols to win, with potential rewards displayed upfront.',
    },
    app: React.lazy(() => import('./Slots')),
  },
  {
    id: 'flip',
    meta: {
      background: '#ffe694',
      name: 'Flip',
      image: '/games/flip.png',
      description:
        'Flip offers a straightforward gamble: choose Heads or Tails and double your money or lose it all.',
    },
    app: React.lazy(() => import('./Flip')),
  },
  {
    id: 'hilo',
    meta: {
      background: '#ff4f4f',
      name: 'HiLo',
      image: '/games/hilo.png',
      description:
        'HiLo is a game of foresight and luck, challenging players to guess whether the next card will be higher or lower.',
    },
    props: { logo: '/logo.svg' },
    app: React.lazy(() => import('./HiLo')),
  },
  {
    id: 'mines',
    meta: {
      background: '#8376ff',
      name: 'Mines',
      image: '/games/mines.png',
      description:
        "There's money hidden beneath the squares. The reward increases as you reveal more squares, but touch a mine and you lose.",
    },
    app: React.lazy(() => import('./Mines')),
  },
  {
    id: 'roulette',
    meta: {
      background: '#1de87e',
      name: 'Roulette',
      image: '/games/roulette.png',
      description:
        'Roulette brings the classic wheel-spinning game to life with a digital twist. Bet on where the ball will land and watch the wheel decide your fate.',
    },
    app: React.lazy(() => import('./Roulette')),
  },
  {
    id: 'plinko',
    meta: {
      background: '#7272ff',
      name: 'Plinko',
      image: '/games/plinko.png',
      description:
        'Plinko is played by dropping chips down a pegged board where they randomly fall into slots with varying win amounts.',
    },
    app: React.lazy(() => import('./Plinko')),
  },
  {
    id: 'crash',
    meta: {
      background: '#de95e8',
      name: 'Crash',
      image: '/games/crash.png',
      description:
        'Predict a multiplier target and watch a rocket attempt to reach it. If it crashes before target, you lose; otherwise you win.',
    },
    app: React.lazy(() => import('./Crash')),
  },
  {
    id: 'blackjack',
    meta: {
      background: '#084700',
      name: 'BlackJack',
      image: '/games/blackjack.png',
      description:
        'A simplified blackjack game where you and the dealer each get two cards. Win 2.5x with blackjack or 2x when your total beats the dealer.',
    },
    app: React.lazy(() => import('./BlackJack')),
  },
]
