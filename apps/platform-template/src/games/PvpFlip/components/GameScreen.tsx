import React from 'react'
import { Canvas } from '@react-three/fiber'
import { multiplayer } from '@gamba/core'
import { useConnector } from '@solana/connector'
import type { Address } from '@solana/kit'
import { GambaUi, useSound } from '../../../game-ui'
import { PLATFORM_CREATOR_ADDRESS, PLATFORM_CREATOR_FEE_BPS } from '../../../config/constants'
import { useConnectWalletModal } from '../../../providers/ConnectWalletModalContext'
import { useGambaPlay } from '../../../hooks/useGambaPlay'
import { NATIVE_MINT, usePlinkoRaceActions, usePlinkoRaceGame } from '../../PlinkoRace/multiplayer'
import { Coin } from '../three/Coin'
import { Effect } from '../three/Effect'
import HEADS_IMG from '../assets/heads.png'
import TAILS_IMG from '../assets/tails.png'
import SOUND_COIN from '../assets/coin.mp3'
import SOUND_WIN from '../assets/win.mp3'
import SOUND_LOSE from '../assets/lose.mp3'
import * as S from './GameScreen.styles'

const LAMPORTS_PER_SOL = 1_000_000_000

function toAddress(value: unknown): Address | null {
  if (!value) return null
  const normalized = String((value as any)?.address ?? value)
  return normalized as Address
}

function toSolString(lamports: number) {
  return `${(lamports / LAMPORTS_PER_SOL).toFixed(2)} SOL`
}

function parseSide(raw?: string): 'heads' | 'tails' | undefined {
  if (!raw) return undefined
  const value = raw.toLowerCase().trim()
  if (value === 'heads' || value === 'head') return 'heads'
  if (value === 'tails' || value === 'tail') return 'tails'
  return undefined
}

function formatTime(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function shortAddress(address: string) {
  return `${address.slice(0, 4)}…${address.slice(-4)}`
}

type Side = 'heads' | 'tails'

type SideAssignment = {
  address?: string
  label: string
  specified: boolean
}

type SideAssignments = {
  heads?: SideAssignment
  tails?: SideAssignment
}

export default function GameScreen({
  gameAddress,
  onBack,
}: {
  gameAddress: Address
  onBack: () => void
}) {
  const { account, isConnected } = useConnector()
  const { openConnectModal } = useConnectWalletModal()
  const { game: chainGame, metadata } = usePlinkoRaceGame(gameAddress)
  const { joinGame, leaveGame } = usePlinkoRaceActions()
  const { play } = useGambaPlay()
  const sounds = useSound({ coin: SOUND_COIN, win: SOUND_WIN, lose: SOUND_LOSE })

  const userAddress = React.useMemo(() => toAddress(account), [account])

  const [timeLeft, setTimeLeft] = React.useState(0)
  const [busy, setBusy] = React.useState(false)
  const [chosenSide, setChosenSide] = React.useState<Side | undefined>()

  const [flipping, setFlipping] = React.useState(false)
  const [resultIndex, setResultIndex] = React.useState(0)
  const [revealed, setRevealed] = React.useState(false)

  const [botMode, setBotMode] = React.useState(false)
  const [botMakerSide, setBotMakerSide] = React.useState<Side>('heads')
  const [botOppSide, setBotOppSide] = React.useState<Side>('tails')
  const [botWager, setBotWager] = React.useState<number | undefined>(undefined)

  React.useEffect(() => {
    if (!chainGame?.softExpirationTimestamp) return

    const endMs = Number(chainGame.softExpirationTimestamp) * 1000
    const tick = () => setTimeLeft(Math.max(endMs - Date.now(), 0))
    tick()

    const interval = window.setInterval(tick, 1000)
    return () => window.clearInterval(interval)
  }, [chainGame?.softExpirationTimestamp])

  const isWaiting = Number(chainGame?.state) === Number(multiplayer.GameState.Waiting)
  const isWaitingUi = botMode ? false : isWaiting

  const sidesByPlayer = React.useMemo(() => {
    const map = new Map<string, Side>()
    if (!chainGame) return map

    chainGame.players.forEach((player, index) => {
      const playerAddress = String(player.user)
      const metadataSide = parseSide(metadata[playerAddress])
      map.set(playerAddress, metadataSide ?? (index === 0 ? 'heads' : 'tails'))
    })

    return map
  }, [chainGame, metadata])

  const takenSides = React.useMemo(() => {
    const set = new Set<Side>()
    if (!chainGame) return set

    chainGame.players.forEach((player) => {
      const side = parseSide(metadata[String(player.user)])
      if (side) set.add(side)
    })

    return set
  }, [chainGame, metadata])

  const iAmInGame = React.useMemo(() => {
    if (!userAddress || !chainGame) return false
    return chainGame.players.some((player) => String(player.user) === userAddress)
  }, [chainGame, userAddress])

  const myPlayer = React.useMemo(() => {
    if (!userAddress || !chainGame) return null
    return chainGame.players.find((player) => String(player.user) === userAddress) ?? null
  }, [chainGame, userAddress])

  const canPickHeads = !takenSides.has('heads')
  const canPickTails = !takenSides.has('tails')

  const betLabel = React.useMemo(() => {
    if (botMode && botWager != null) {
      return toSolString(botWager)
    }

    if (!chainGame) return ''

    if (Number(chainGame.wagerType) === Number(multiplayer.WagerType.SameWager)) {
      return toSolString(Number(chainGame.wager))
    }

    if (Number(chainGame.wagerType) === Number(multiplayer.WagerType.CustomWager)) {
      return 'Custom'
    }

    return `${toSolString(Number(chainGame.minBet))} - ${toSolString(Number(chainGame.maxBet))}`
  }, [botMode, botWager, chainGame])

  const sideAssignments = React.useMemo((): SideAssignments => {
    const value: SideAssignments = {}

    if (!chainGame) return value

    chainGame.players.forEach((player, index) => {
      const playerAddress = String(player.user)
      const resolvedSide = parseSide(metadata[playerAddress])
      const side = resolvedSide ?? (index === 0 ? 'heads' : 'tails')
      value[side] = {
        address: playerAddress,
        label: shortAddress(playerAddress),
        specified: resolvedSide != null,
      }
    })

    return value
  }, [chainGame, metadata])

  const uiAssignments = React.useMemo((): SideAssignments => {
    if (botMode) {
      return {
        [botMakerSide]: { label: 'You', specified: true },
        [botOppSide]: { label: 'BOT', specified: true },
      }
    }
    return sideAssignments
  }, [botMakerSide, botMode, botOppSide, sideAssignments])

  React.useEffect(() => {
    if (chosenSide) return
    if (canPickHeads && !canPickTails) setChosenSide('heads')
    if (!canPickHeads && canPickTails) setChosenSide('tails')
  }, [canPickHeads, canPickTails, chosenSide])

  const resetVisualState = React.useCallback(() => {
    setFlipping(false)
    setRevealed(false)
    setResultIndex(0)
    setBotMode(false)
    setBotWager(undefined)
  }, [])

  React.useEffect(() => {
    resetVisualState()
  }, [gameAddress, resetVisualState])

  const handleJoin = async () => {
    if (!chainGame || !chosenSide) return
    if (!isConnected || !userAddress) {
      openConnectModal()
      return
    }

    setBusy(true)
    try {
      sounds.play('coin', { playbackRate: 0.5 })

      const wagerLamports =
        Number(chainGame.wagerType) === Number(multiplayer.WagerType.SameWager)
          ? Number(chainGame.wager)
          : Number(chainGame.minBet > 0n ? chainGame.minBet : chainGame.wager)

      await joinGame({
        gameAccount: gameAddress,
        mint: chainGame.mint as Address,
        wager: wagerLamports,
        creatorAddress: PLATFORM_CREATOR_ADDRESS,
        creatorFeeBps: PLATFORM_CREATOR_FEE_BPS,
        metadata: chosenSide,
      })

      sounds.play('coin')
    } catch (error) {
      console.error(error)
    } finally {
      setBusy(false)
    }
  }

  React.useEffect(() => {
    if (!chainGame || botMode || revealed) return

    const settled = Number(chainGame.state) === Number(multiplayer.GameState.Settled)
    if (!settled || chainGame.winnerIndexes.length === 0) return

    const winnerIndex = Number(chainGame.winnerIndexes[0] ?? 0)
    const winnerPlayer = chainGame.players[winnerIndex]
    if (!winnerPlayer) return

    const winnerSide = sidesByPlayer.get(String(winnerPlayer.user)) ?? 'heads'
    const nextResultIndex = winnerSide === 'tails' ? 1 : 0

    setFlipping(true)
    try {
      sounds.play('coin', { playbackRate: 0.5 })
    } catch {
      // Ignore playback errors.
    }

    const timer = window.setTimeout(() => {
      setResultIndex(nextResultIndex)
      setFlipping(false)
      setRevealed(true)
      sounds.play(nextResultIndex === 1 ? 'win' : 'lose')
    }, 2000)

    return () => window.clearTimeout(timer)
  }, [botMode, chainGame, revealed, sidesByPlayer, sounds])

  const winningSide = React.useMemo<Side | undefined>(() => {
    if (!chainGame || Number(chainGame.state) !== Number(multiplayer.GameState.Settled)) return undefined
    const winnerIndex = Number(chainGame.winnerIndexes[0] ?? 0)
    const winner = chainGame.players[winnerIndex]
    if (!winner) return undefined
    return sidesByPlayer.get(String(winner.user)) ?? 'heads'
  }, [chainGame, sidesByPlayer])

  const winningSideUi = React.useMemo<Side | undefined>(() => {
    if (botMode && revealed) return resultIndex === 1 ? 'tails' : 'heads'
    return winningSide
  }, [botMode, revealed, resultIndex, winningSide])

  const canCallBot = React.useMemo(() => {
    if (!chainGame || !userAddress) return false
    if (Number(chainGame.state) !== Number(multiplayer.GameState.Waiting)) return false
    if (chainGame.players.length !== 1) return false
    return String(chainGame.players[0].user) === userAddress
  }, [chainGame, userAddress])

  const handleCallBot = async () => {
    if (!chainGame || !userAddress || !myPlayer) return

    setBusy(true)
    try {
      const makerSide = sidesByPlayer.get(userAddress) ?? 'heads'
      const opponentSide = makerSide === 'heads' ? 'tails' : 'heads'
      const wagerLamports = Number(myPlayer.wager > 0n ? myPlayer.wager : chainGame.wager)

      setBotMakerSide(makerSide)
      setBotOppSide(opponentSide)
      setBotWager(wagerLamports)

      await leaveGame({
        gameAccount: gameAddress,
        mint: chainGame.mint as Address,
      })

      setBotMode(true)
      setFlipping(true)
      sounds.play('coin', { playbackRate: 0.5 })

      const bet = makerSide === 'heads' ? [2, 0] : [0, 2]
      const playResult = await play(bet, {
        wager: wagerLamports,
        metadata: JSON.stringify({ gameId: 'pvpflip', side: makerSide }),
      })

      if ('error' in playResult) {
        throw playResult.error
      }

      let nextResultIndex = 0
      if ('settled' in playResult && playResult.settled) {
        nextResultIndex = playResult.resultIndex % 2
      }

      window.setTimeout(() => {
        setResultIndex(nextResultIndex)
        setFlipping(false)
        setRevealed(true)
        sounds.play(nextResultIndex === 1 ? 'win' : 'lose')
      }, 2000)
    } catch (error) {
      console.error(error)
      setFlipping(false)
      setBotMode(false)
    } finally {
      setBusy(false)
    }
  }

  const botPlayDisabled = !!chainGame && String(chainGame.mint) !== String(NATIVE_MINT)

  return (
    <>
      <Canvas linear flat orthographic camera={{ zoom: 80, position: [0, 0, 100] }}>
        <React.Suspense fallback={null}>
          <Coin result={resultIndex} flipping={botMode ? flipping : flipping || isWaiting} />
        </React.Suspense>

        {flipping && <Effect color="white" />}
        {revealed && <Effect color="#42ff78" />}

        <ambientLight intensity={3} />
        <directionalLight position-z={1} position-y={1} castShadow color="#CCCCCC" />
        <hemisphereLight intensity={0.5} position={[0, 1, 0]} scale={[1, 1, 1]} color="#ffadad" groundColor="#6666fe" />
      </Canvas>

      <S.HudRoot>
        <S.InfoRail>
          <S.SideCard $tone="heads" $present={Boolean(uiAssignments.heads)} $winner={revealed && winningSideUi === 'heads'}>
            <S.SideIconFrame $tone="heads">
              <S.SideIcon src={HEADS_IMG} alt="Heads" />
            </S.SideIconFrame>
            <S.SideContent>
              <S.SideName>Heads</S.SideName>
              <S.SidePlayer>{uiAssignments.heads?.label ?? '—'}</S.SidePlayer>
              {uiAssignments.heads && !uiAssignments.heads.specified && <S.SideFallback>random</S.SideFallback>}
            </S.SideContent>
          </S.SideCard>

          <S.CenterStack>
            <S.VsBadge>VS</S.VsBadge>
            <S.BetPill>{betLabel}</S.BetPill>
          </S.CenterStack>

          <S.SideCard $tone="tails" $present={Boolean(uiAssignments.tails)} $winner={revealed && winningSideUi === 'tails'}>
            <S.SideIconFrame $tone="tails">
              <S.SideIcon src={TAILS_IMG} alt="Tails" />
            </S.SideIconFrame>
            <S.SideContent>
              <S.SideName>Tails</S.SideName>
              <S.SidePlayer>{uiAssignments.tails?.label ?? '—'}</S.SidePlayer>
              {uiAssignments.tails && !uiAssignments.tails.specified && <S.SideFallback>random</S.SideFallback>}
            </S.SideContent>
          </S.SideCard>
        </S.InfoRail>
      </S.HudRoot>

      <S.StatusRoot>
        <S.StatusBadge>
          <S.StatusDot $waiting={isWaitingUi} />
          {isWaitingUi ? 'Waiting for players' : revealed ? 'Settled' : 'Spinning...'}
        </S.StatusBadge>
        {isWaitingUi && timeLeft > 0 && <S.StatusSubline>Starts in {formatTime(timeLeft)}</S.StatusSubline>}
      </S.StatusRoot>

      <GambaUi.Portal target="controls">
        <S.ControlButton onClick={onBack}>
          ← Lobby
        </S.ControlButton>

        {chainGame && !botMode ? (
          !isConnected ? (
            <S.ControlButton $variant="primary" onClick={openConnectModal}>
              Connect Wallet
            </S.ControlButton>
          ) : !iAmInGame ? (
            <S.ControlsGroup>
              <S.SideToggleGroup>
                <S.SideChoiceButton
                  disabled={!canPickHeads || busy}
                  $active={chosenSide === 'heads'}
                  onClick={() => setChosenSide('heads')}
                >
                  Heads
                </S.SideChoiceButton>
                <S.SideChoiceButton
                  disabled={!canPickTails || busy}
                  $active={chosenSide === 'tails'}
                  onClick={() => setChosenSide('tails')}
                >
                  Tails
                </S.SideChoiceButton>
              </S.SideToggleGroup>
              <S.ControlButton
                $variant="primary"
                disabled={!chosenSide || busy}
                onClick={() => void handleJoin()}
              >
                {busy ? 'Joining...' : 'Join'}
              </S.ControlButton>
            </S.ControlsGroup>
          ) : canCallBot ? (
            <S.ControlButton
              $variant="primary"
              onClick={() => void handleCallBot()}
              disabled={busy || botPlayDisabled}
              title={botPlayDisabled ? 'Bot mode is only available for SOL games.' : undefined}
            >
              {busy ? 'Calling...' : 'Call a Bot'}
            </S.ControlButton>
          ) : null
        ) : null}
      </GambaUi.Portal>
    </>
  )
}
