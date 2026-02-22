import React from 'react'
import type { Address } from '@solana/kit'
import { GambaUi } from '../../game-ui'

import Lobby from './components/Lobby'
import GameScreen from './components/GameScreen'

export default function PvpFlip() {
  const [selectedGame, setSelectedGame] = React.useState<Address | null>(null)

  const handleBack = React.useCallback(() => {
    setSelectedGame(null)
  }, [])

  return (
    <GambaUi.Portal target="screen">
      {selectedGame ? <GameScreen gameAddress={selectedGame} onBack={handleBack} /> : <Lobby onSelect={setSelectedGame} />}
    </GambaUi.Portal>
  )
}
