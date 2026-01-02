import React from 'react'
import { useConnector } from '@solana/connector'
import { Header } from './components/Header'
import GameSection from './sections/Game/Game'
import { Home } from './sections/Home/Home'
import { MainWrapper } from './styles/layout'
import { RecentPlays } from './sections/RecentPlays/RecentPlays'

export function App() {
  const { isConnected } = useConnector()

  const [route, setRoute] = React.useState<'home' | 'game'>('home')
  const [activeGame, setActiveGame] = React.useState<string | null>(null)

  return (
    <div>
      <Header route={route} onRoute={setRoute} />
      <div style={{ paddingTop: 72 }}>
        <MainWrapper>
          {route === 'home' && (
            <Home onOpenGame={(id) => { setActiveGame(id); setRoute('game') }} />
          )}
          {route === 'game' && activeGame && (
            <GameSection id={activeGame} />
          )}
          <div style={{ marginTop: 24 }}>
            <RecentPlays />
          </div>
        </MainWrapper>
      </div>
    </div>
  )
}
