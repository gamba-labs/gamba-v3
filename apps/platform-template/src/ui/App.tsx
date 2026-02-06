import { Route, Routes } from 'react-router-dom'
import Header from './sections/Header'
import Dashboard from './sections/Dashboard/Dashboard'
import Game from './sections/Game/Game'
import { MainWrapper } from './styles/layout'
import { RecentPlays } from './sections/RecentPlays/RecentPlays'

export function App() {
  return (
    <>
      <Header />
      <MainWrapper>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/:gameId" element={<Game />} />
        </Routes>

        <h2 style={{ textAlign: 'center' }}>Recent Plays</h2>
        <RecentPlays />
      </MainWrapper>
    </>
  )
}
