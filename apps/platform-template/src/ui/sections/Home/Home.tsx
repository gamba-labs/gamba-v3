import React from 'react'
import { Banner, BannerText, BannerTitle, GameCard, GameMeta, GameThumb, GamesGrid, RecentList } from './Home.styles'

type GameDef = { id: string; name: string; image: string; description: string }

const GAMES: GameDef[] = [
  { id: 'plinko', name: 'Plinko', image: '/logo.svg', description: 'Drop the ball, hit multipliers.' },
  { id: 'roulette', name: 'Roulette', image: '/logo.svg', description: 'Spin and win.' },
  { id: 'coinflip', name: 'Coin Flip', image: '/logo.svg', description: 'Pick a side.' },
]

export function Home({ onOpenGame }: { onOpenGame: (id: string) => void }) {
  return (
    <div>
      <Banner>
        <div>
          <BannerTitle>Welcome to Gamba</BannerTitle>
          <BannerText>Play on-chain games with Solana speed. Select a game below to start.</BannerText>
        </div>
        <div style={{ textAlign: 'right', opacity: 0.9 }}>
          <img src="/logo.svg" alt="Gamba" height={80} />
        </div>
      </Banner>

      <GamesGrid>
        {GAMES.map((g) => (
          <GameCard key={g.id} onClick={() => onOpenGame(g.id)}>
            <GameThumb>
              <img src={g.image} alt="" />
            </GameThumb>
            <GameMeta>
              <div style={{ fontWeight: 700 }}>{g.name}</div>
              <div style={{ opacity: 0.8, fontSize: 14 }}>{g.description}</div>
            </GameMeta>
          </GameCard>
        ))}
      </GamesGrid>

      <RecentList>
        <div style={{ opacity: 0.8 }}>Recent plays will appear here.</div>
      </RecentList>
    </div>
  )
}


