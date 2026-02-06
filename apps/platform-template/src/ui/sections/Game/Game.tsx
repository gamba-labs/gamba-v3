import React from 'react'
import { useParams } from 'react-router-dom'
import styled from 'styled-components'
import { useConnector } from '@solana/connector'
import { useToken } from '../../../providers/TokenContext'
import { TOKENS } from '../../../config/constants'
import { GAMES, type GameResult } from '../../../games'
import { useGambaPlay, type PlayPhase } from '../../../hooks/useGambaPlay'
import { ConnectWallet } from '../../components/ConnectWallet'
import { Icon } from '../../components/Icon'
import { Modal } from '../../components/Modal'
import { SlideSection } from '../../components/Slider'
import { GameCard } from '../Dashboard/GameCard'
import { Container, Controls, IconButton, MetaControls, Screen, Splash } from './Game.styles'
import { LoadingBar } from './LoadingBar'
import { WagerInput } from './WagerInput'

const FLIP_WAGER_PRESETS = [1, 5, 10, 50, 100]
const FLIP_BETS = {
  heads: [2, 0],
  tails: [0, 2],
} as const

const WagerButton = styled.button<{ $active?: boolean }>`
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid ${(p) => (p.$active ? '#9564ff' : 'rgba(255,255,255,0.2)')};
  background: ${(p) => (p.$active ? 'rgba(149, 100, 255, 0.2)' : 'transparent')};
  color: white;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.15s;

  &:hover:not(:disabled) {
    border-color: #9564ff;
    background: rgba(149, 100, 255, 0.1);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const PlayButton = styled.button`
  padding: 10px 18px;
  border-radius: var(--gamba-ui-border-radius);
  border: none;
  background: var(--gamba-ui-button-main-background);
  color: var(--gamba-ui-button-main-color);
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.15s ease;
  min-width: 120px;
  height: 45px;

  &:hover:not(:disabled) {
    background: var(--gamba-ui-button-main-background-hover);
  }

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
  }
`

const SideButton = styled.button`
  --button-background: var(--gamba-ui-button-default-background);
  --button-hover: var(--gamba-ui-button-default-background-hover);
  --button-color: var(--gamba-ui-button-default-color);

  height: 45px;
  border: none;
  border-radius: var(--gamba-ui-border-radius);
  padding: 0 12px;
  color: var(--button-color);
  background: var(--button-background);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;

  &:hover:not(:disabled) {
    background: var(--button-hover);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.7;
  }
`

const SideButtonInner = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
`

const SideIcon = styled.img`
  height: 20px;
  width: 20px;
  object-fit: contain;
  -webkit-user-drag: none;
`

const WagerDisplay = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: white;

  .amount {
    font-size: 20px;
    font-weight: 600;
  }

  .label {
    font-size: 12px;
    opacity: 0.6;
  }
`

const WagerControls = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`

const SliderWrapper = styled.div`
  margin-top: 10px;
`

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
  const [ready, setReady] = React.useState(false)
  const [infoOpen, setInfoOpen] = React.useState(false)
  const [soundOn, setSoundOn] = React.useState(true)
  const [playPhase, setPlayPhase] = React.useState<PlayPhase>('idle')

  const game = React.useMemo(() => GAMES.find((entry) => entry.id === id) ?? null, [id])
  const isFlip = game?.id === 'flip'
  const { isConnected } = useConnector()
  const { play } = useGambaPlay()
  const { selected } = useToken()

  const tokenCfg = React.useMemo(() => TOKENS.find((token) => token.id === selected.id), [selected])
  const decimals = tokenCfg?.decimals ?? 0
  const ticker = tokenCfg?.ticker ?? ''

  const toLamports = React.useCallback((units: number) => Math.round(units * Math.pow(10, decimals)), [decimals])

  const formatUnits = React.useCallback(
    (lamports: number | bigint) => {
      const num = Number(lamports) / Math.pow(10, decimals)
      return num.toFixed(Math.min(4, decimals))
    },
    [decimals],
  )

  const unitOptions = React.useMemo<number[]>(() => (decimals >= 8 ? [0.01, 0.1, 0.5, 1] : [1, 5, 10, 50, 100]), [decimals])
  const wagerOptions = React.useMemo(() => unitOptions.map(toLamports), [unitOptions, toLamports])
  const baseWager = React.useMemo(() => Math.max(1, Math.round(tokenCfg?.baseWager ?? wagerOptions[0] ?? 1)), [tokenCfg, wagerOptions])

  const [wagerIndex, setWagerIndex] = React.useState(0)
  const [flipWager, setFlipWager] = React.useState(baseWager)
  const [flipSide, setFlipSide] = React.useState<keyof typeof FLIP_BETS>('heads')
  const fallbackWager = wagerOptions[wagerIndex] ?? wagerOptions[0] ?? baseWager
  const activeWager = isFlip ? flipWager : fallbackWager

  const [loading, setLoading] = React.useState(false)
  const [result, setResult] = React.useState<GameResult | null>(null)

  const adjustWager = (delta: number) => {
    setWagerIndex((index) => Math.max(0, Math.min(wagerOptions.length - 1, index + delta)))
  }

  const onPlay = async () => {
    if (!game) return

    try {
      setLoading(true)
      setResult(null)

      const bet = isFlip ? [...FLIP_BETS[flipSide]] : game.bet
      const metadata = isFlip
        ? JSON.stringify({ gameId: game.id, side: flipSide })
        : JSON.stringify({ game: game.meta.name })

      const res = await play(bet, {
        wager: activeWager,
        metadata,
        onPhase: setPlayPhase,
      })

      if ('error' in res) {
        console.error('[Game] Play error:', res.error)
        return
      }

      if ('settled' in res && res.settled) {
        setResult({
          signature: res.signature,
          payout: res.payout,
          wager: res.wager,
          win: res.win,
        })
      } else if ('signature' in res) {
        setResult({
          signature: res.signature,
          payout: 0n,
          wager: BigInt(activeWager),
          win: false,
        })
      }
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    const t = setTimeout(() => setReady(true), inline ? 300 : 750)
    return () => clearTimeout(t)
  }, [inline, id])

  React.useEffect(() => {
    setWagerIndex(0)
  }, [selected.id])

  React.useEffect(() => {
    setFlipWager(baseWager)
  }, [baseWager, selected.id])

  React.useEffect(() => {
    setFlipSide('heads')
  }, [id])

  if (!game) {
    return <h1>Game not found</h1>
  }

  return (
    <>
      <Modal open={infoOpen} onClose={() => setInfoOpen(false)}>
        <h1 style={{ marginTop: 0, marginBottom: 10, textAlign: 'center' }}>
          <img height="100" title={game.meta.name} src={game.meta.image} alt={game.meta.name} />
        </h1>
        <p style={{ marginTop: 0 }}>{game.meta.description}</p>
      </Modal>

      <Container>
        <Screen>
          <Splash>
            <img height="150" src={game.meta.image} alt={game.meta.name} />
          </Splash>
          {ready && (
            <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'white' }}>
              {!isConnected ? (
                <div style={{ display: 'grid', gap: 16, placeItems: 'center' }}>
                  <div style={{ opacity: 0.9 }}>Connect wallet to play {game.meta.name}.</div>
                  <ConnectWallet />
                </div>
              ) : (
                <React.Suspense fallback={<div style={{ opacity: 0.6 }}>Loading...</div>}>
                  <game.app result={result} loading={loading} wager={activeWager} />
                </React.Suspense>
              )}
            </div>
          )}

          <MetaControls>
            <IconButton onClick={() => setInfoOpen(true)}>
              <Icon.Info />
            </IconButton>
            <IconButton onClick={() => setSoundOn((value) => !value)}>
              {soundOn ? <Icon.Volume /> : <Icon.VolumeMuted />}
            </IconButton>
          </MetaControls>
        </Screen>

        <LoadingBar phase={playPhase} />

        <Controls>
          {isFlip ? (
            <>
              <WagerInput value={flipWager} onChange={setFlipWager} options={FLIP_WAGER_PRESETS} disabled={loading || !isConnected} />

              <SideButton disabled={loading || !isConnected} onClick={() => setFlipSide((side) => (side === 'heads' ? 'tails' : 'heads'))}>
                <SideButtonInner>
                  <SideIcon src={flipSide === 'heads' ? '/games/flip/heads.png' : '/games/flip/tails.png'} alt={flipSide} />
                  {flipSide === 'heads' ? 'Heads' : 'Tails'}
                </SideButtonInner>
              </SideButton>

              <PlayButton onClick={onPlay} disabled={loading || !isConnected}>
                {loading ? 'Flipping...' : game.playLabel ?? 'Play'}
              </PlayButton>
            </>
          ) : (
            <>
              <WagerControls>
                <WagerButton onClick={() => adjustWager(-1)} disabled={loading || wagerIndex === 0}>
                  -
                </WagerButton>
                <WagerDisplay>
                  <div className="amount">
                    {formatUnits(fallbackWager)} {ticker}
                  </div>
                  <div className="label">Wager</div>
                </WagerDisplay>
                <WagerButton onClick={() => adjustWager(1)} disabled={loading || wagerIndex === wagerOptions.length - 1}>
                  +
                </WagerButton>
              </WagerControls>

              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                {wagerOptions.map((option, index) => (
                  <WagerButton key={option} $active={wagerIndex === index} onClick={() => setWagerIndex(index)} disabled={loading}>
                    {unitOptions[index]}
                  </WagerButton>
                ))}
              </div>

              <PlayButton onClick={onPlay} disabled={loading || !isConnected}>
                {loading ? 'Playing...' : game.playLabel ?? 'Play'}
              </PlayButton>
            </>
          )}
        </Controls>
      </Container>
    </>
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
