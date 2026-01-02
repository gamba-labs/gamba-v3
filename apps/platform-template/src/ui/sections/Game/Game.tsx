import React from 'react'
import { Container, Controls, MetaControls, Screen, Splash, StyledLoadingIndicator } from './Game.styles'
import { useToken } from '../../../providers/TokenContext'
import { GAMES, type GameResult } from '../../../games'
import { useConnector } from '@solana/connector'
import { ConnectWallet } from '../../components/ConnectWallet'
import { useGambaPlay } from '../../../hooks/useGambaPlay'
import { TOKENS } from '../../../config/constants'
import styled from 'styled-components'

const WagerButton = styled.button<{ $active?: boolean }>`
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid ${p => p.$active ? '#9564ff' : 'rgba(255,255,255,0.2)'};
  background: ${p => p.$active ? 'rgba(149, 100, 255, 0.2)' : 'transparent'};
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
  padding: 12px 32px;
  border-radius: 8px;
  border: none;
  background: linear-gradient(135deg, #9564ff 0%, #7c4dff 100%);
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  min-width: 120px;
  &:hover:not(:disabled) {
    transform: scale(1.02);
    box-shadow: 0 4px 20px rgba(149, 100, 255, 0.4);
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
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

export default function GameSection({ id }: { id: string }) {
  const [ready, setReady] = React.useState(false)
  const game = React.useMemo(() => GAMES.find((g) => g.id === id) ?? null, [id])
  const { isConnected } = useConnector()
  const { play } = useGambaPlay()
  const { selected } = useToken()

  // Token config
  const tokenCfg = React.useMemo(() => TOKENS.find((t) => t.id === selected.id), [selected])
  const decimals = tokenCfg?.decimals ?? 0
  const ticker = tokenCfg?.ticker ?? ''

  // Wager helpers
  const toLamports = React.useCallback((units: number) => Math.round(units * Math.pow(10, decimals)), [decimals])
  const formatUnits = React.useCallback((lamports: number | bigint) => {
    const num = Number(lamports) / Math.pow(10, decimals)
    return num.toFixed(Math.min(4, decimals))
  }, [decimals])

  const UNIT_OPTIONS = React.useMemo<number[]>(() => (
    decimals >= 8 ? [0.01, 0.1, 0.5, 1] : [1, 5, 10, 50, 100]
  ), [decimals])

  const WAGER_OPTIONS = React.useMemo(() => UNIT_OPTIONS.map(toLamports), [UNIT_OPTIONS, toLamports])
  const [wagerIndex, setWagerIndex] = React.useState(0)
  const wager = WAGER_OPTIONS[wagerIndex] ?? WAGER_OPTIONS[0]

  // Game state
  const [loading, setLoading] = React.useState(false)
  const [result, setResult] = React.useState<GameResult | null>(null)

  const adjustWager = (delta: number) => {
    setWagerIndex(i => Math.max(0, Math.min(WAGER_OPTIONS.length - 1, i + delta)))
  }

  const onPlay = async () => {
    if (!game) return
    try {
      setLoading(true)
      setResult(null)
      const res = await play(game.bet, { wager, metadata: JSON.stringify({ game: game.meta.name }) })
      
      if ('error' in res) {
        console.error('[Game] Play error:', res.error)
        return
      }
      
      if ('settled' in res && res.settled) {
        // Got actual result from game account
        setResult({
          signature: res.signature,
          payout: res.payout,
          wager: res.wager,
          win: res.win,
        })
      } else if ('signature' in res) {
        // Transaction sent but couldn't get result
        setResult({
          signature: res.signature,
          payout: 0n,
          wager: BigInt(wager),
          win: false,
        })
      }
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    const t = setTimeout(() => setReady(true), 500)
    return () => clearTimeout(t)
  }, [])

  // Reset wager index when token changes
  React.useEffect(() => {
    setWagerIndex(0)
  }, [selected.id])

  return (
    <Container>
      <Screen>
        <Splash><img height="120" src="/logo.svg" /></Splash>
        {ready && game && (
          <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'white' }}>
            {!isConnected ? (
              <div style={{ display: 'grid', gap: 16, placeItems: 'center' }}>
                <div style={{ opacity: 0.9 }}>Connect wallet to play {game.meta.name}.</div>
                <ConnectWallet />
              </div>
            ) : (
              <React.Suspense fallback={<div style={{ opacity: 0.6 }}>Loading…</div>}>
                <game.app result={result} loading={loading} wager={wager} />
              </React.Suspense>
            )}
          </div>
        )}
        <MetaControls>
          {/* Info button etc */}
        </MetaControls>
      </Screen>
      <StyledLoadingIndicator $active={loading} />
      <Controls>
        <WagerControls>
          <WagerButton onClick={() => adjustWager(-1)} disabled={loading || wagerIndex === 0}>
            −
          </WagerButton>
          <WagerDisplay>
            <div className="amount">{formatUnits(wager)} {ticker}</div>
            <div className="label">Wager</div>
          </WagerDisplay>
          <WagerButton onClick={() => adjustWager(1)} disabled={loading || wagerIndex === WAGER_OPTIONS.length - 1}>
            +
          </WagerButton>
        </WagerControls>

        <div style={{ display: 'flex', gap: 6 }}>
          {WAGER_OPTIONS.map((opt, i) => (
            <WagerButton
              key={opt}
              $active={wagerIndex === i}
              onClick={() => setWagerIndex(i)}
              disabled={loading}
            >
              {UNIT_OPTIONS[i]}
            </WagerButton>
          ))}
        </div>

        <PlayButton onClick={onPlay} disabled={loading || !isConnected}>
          {loading ? 'Playing…' : game?.playLabel ?? 'Play'}
        </PlayButton>
      </Controls>
    </Container>
  )
}
