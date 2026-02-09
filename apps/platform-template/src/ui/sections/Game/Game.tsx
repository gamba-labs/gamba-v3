import React from 'react'
import { useParams } from 'react-router-dom'
import { GAMES } from '../../../games'
import { Icon } from '../../components/Icon'
import { Modal } from '../../components/Modal'
import { SlideSection } from '../../components/Slider'
import { GameCard } from '../Dashboard/GameCard'
import { LoadingBar } from './LoadingBar'
import { Container, Controls, IconButton, MetaControls, Screen, Splash } from './Game.styles'
import {
  GameRuntimeProvider,
  GambaUi,
  PortalProvider,
  type GameBundle,
  useGameRuntime,
  useSoundStore,
} from '../../../game-ui'

function RuntimeLoadingBar() {
  const { phase } = useGameRuntime()
  return <LoadingBar phase={phase} />
}

function RuntimeView({ game, ready }: { game: GameBundle; ready: boolean }) {
  return (
    <>
      <Screen>
        <Splash key={game.id}>
          <img height="150" src={game.meta.image} alt={game.meta.name} />
        </Splash>

        <GambaUi.PortalTarget target="error" />
        {ready && <GambaUi.PortalTarget target="screen" />}

        {ready && (
          <>
            <React.Suspense fallback={null}>
              <game.app {...game.props} />
            </React.Suspense>
          </>
        )}

        <MetaButtons game={game} />
      </Screen>

      <RuntimeLoadingBar />

      <Controls>
        <GambaUi.PortalTarget target="controls" />
        <GambaUi.PortalTarget target="play" />
      </Controls>
    </>
  )
}

function MetaButtons({ game }: { game: GameBundle }) {
  const [infoOpen, setInfoOpen] = React.useState(false)
  const soundStore = useSoundStore()
  const soundOn = soundStore.volume > 0

  return (
    <>
      <Modal open={infoOpen} onClose={() => setInfoOpen(false)}>
        <h1 style={{ marginTop: 0, marginBottom: 10, textAlign: 'center' }}>
          <img height="100" title={game.meta.name} src={game.meta.image} alt={game.meta.name} />
        </h1>
        <p style={{ marginTop: 0 }}>{game.meta.description}</p>
      </Modal>

      <MetaControls>
        <IconButton onClick={() => setInfoOpen(true)}>
          <Icon.Info />
        </IconButton>
        <IconButton onClick={() => soundStore.set(soundOn ? 0 : 0.5)}>
          {soundOn ? <Icon.Volume /> : <Icon.VolumeMuted />}
        </IconButton>
      </MetaControls>
    </>
  )
}

const SliderWrapper = ({ children }: React.PropsWithChildren) => <div style={{ marginTop: 10 }}>{children}</div>

function GameSlider() {
  return (
    <SliderWrapper>
      <SlideSection>
        {GAMES.map((game) => (
          <div key={game.id} style={{ width: '160px', display: 'flex' }}>
            <GameCard game={game} />
          </div>
        ))}
      </SlideSection>
    </SliderWrapper>
  )
}

export function GamePanel({ id, inline = false }: { id: string; inline?: boolean }) {
  const game = React.useMemo(() => GAMES.find((entry) => entry.id === id) ?? null, [id])
  const [ready, setReady] = React.useState(false)

  React.useEffect(() => {
    const timeout = setTimeout(() => setReady(true), inline ? 300 : 750)
    return () => clearTimeout(timeout)
  }, [inline, id])

  if (!game) {
    return <h1>Game not found</h1>
  }

  return (
    <Container>
      <GameRuntimeProvider game={game}>
        <PortalProvider>
          <RuntimeView game={game} ready={ready} />
        </PortalProvider>
      </GameRuntimeProvider>
    </Container>
  )
}

export default function Game() {
  const { gameId } = useParams()

  if (!gameId) {
    return <h1>Game not found</h1>
  }

  return (
    <>
      <GamePanel id={gameId} />
      <GameSlider />
    </>
  )
}
