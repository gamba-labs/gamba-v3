import React from 'react'
import { Container, Controls, MetaControls, Screen, Splash } from './Game.styles'

export default function GameSection() {
  const [ready, setReady] = React.useState(false)
  const [showInfo, setShowInfo] = React.useState(false)

  React.useEffect(() => {
    const t = setTimeout(() => setReady(true), 500)
    return () => clearTimeout(t)
  }, [])

  return (
    <Container>
      <Screen>
        <Splash><img height="120" src="/logo.svg" /></Splash>
        {ready && (
          <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'white', opacity: 0.6 }}>
            Game screen
          </div>
        )}
        <MetaControls>
          <button onClick={() => setShowInfo(true)}>i</button>
        </MetaControls>
      </Screen>
      <Controls>
        <button>Bet -</button>
        <strong>Amount</strong>
        <button>Bet +</button>
        <button>Play</button>
      </Controls>
    </Container>
  )
}


