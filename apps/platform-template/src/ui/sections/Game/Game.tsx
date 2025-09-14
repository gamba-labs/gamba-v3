import React from 'react'
import { Container, Controls, MetaControls, Screen, Splash } from './Game.styles'
import { useToken } from '../../../providers/TokenContext'
import { GAMES } from '../../../games'
import { useWalletCtx } from '../../../providers/WalletContext'
import { ConnectWallet } from '../../components/ConnectWallet'

export default function GameSection({ id }: { id: string }) {
  const [ready, setReady] = React.useState(false)
  const [showInfo, setShowInfo] = React.useState(false)
  const { selectedPool } = useToken()
  const game = React.useMemo(() => GAMES.find((g) => g.id === id) ?? null, [id])
  const { isConnected } = useWalletCtx()

  React.useEffect(() => {
    const t = setTimeout(() => setReady(true), 500)
    return () => clearTimeout(t)
  }, [])

  return (
    <Container>
      <Screen>
        <Splash><img height="120" src="/logo.svg" /></Splash>
        {ready && game && (
          <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'white', opacity: 0.6 }}>
            {!isConnected ? (
              <div style={{ display: 'grid', gap: 16, placeItems: 'center' }}>
                <div style={{ opacity: 0.9 }}>Connect wallet to play {game.meta.name}.</div>
                <ConnectWallet />
              </div>
            ) : (
              <React.Suspense fallback={<div>Loading…</div>}>
                <game.app meta={game.meta} {...(game.props ?? {})} />
              </React.Suspense>
            )}
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
      <div style={{ marginTop: 20 }} />
    </Container>
  )
}


