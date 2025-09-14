import React from 'react'
import { useRpc } from '../providers/RpcContext'
import { useWalletCtx } from '../providers/WalletContext'
import { Header } from './components/Header'
import GameSection from './sections/Game/Game'
import { Home } from './sections/Home/Home'
import { MainWrapper } from '../styles/layout'

export function App() {
  const { rpcUrl, setRpcUrl } = useRpc()
  const { isConnected } = useWalletCtx()

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
        </MainWrapper>
      </div>
    </div>
  )
}


