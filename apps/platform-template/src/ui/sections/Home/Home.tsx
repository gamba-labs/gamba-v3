import React from 'react'
import { Banner, BannerText, BannerTitle, GameCard, GameMeta, GameThumb, GamesGrid, RecentList } from './Home.styles'
import { GAMES } from '../../../games'
import { GameCard as GameCardComponent } from '../../components/GameCard'

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
          <GameCardComponent key={g.id} game={g} onClick={() => onOpenGame(g.id)} />
        ))}
      </GamesGrid>

      <RecentList />
    </div>
  )
}


