import React from 'react'
import type { Address } from '@solana/kit'
import { useConnector } from '@solana/connector'
import { multiplayer } from '@gamba/core'
import { GambaUi, useSound } from '../../../game-ui'
import { PLATFORM_CREATOR_ADDRESS, PLATFORM_CREATOR_FEE_BPS, TOKENS } from '../../../config/constants'
import { CompactInput } from '../../../ui/components/CompactInput'
import { useConnectWalletModal } from '../../../providers/ConnectWalletModalContext'
import { attachMusic, musicManager, stopAndDispose } from '../musicManager'
import { usePlinkoRaceActions, usePlinkoRaceGame } from '../multiplayer'
import Board from '../board/Board'
import actionSnd from '../sounds/action.mp3'

const LAMPORTS_PER_SOL = 1_000_000_000

function clampLamports(value: number, min?: bigint, max?: bigint) {
  const minValue = Number(min ?? 0n)
  const maxValue = max != null ? Number(max) : Number.MAX_SAFE_INTEGER
  if (!Number.isFinite(value)) return minValue
  return Math.max(minValue, Math.min(Math.round(value), maxValue))
}

function toLamports(sol: string) {
  const parsed = Number(sol)
  if (!Number.isFinite(parsed)) return 0
  return Math.max(0, Math.round(parsed * LAMPORTS_PER_SOL))
}

function toSolString(lamports: number) {
  return (lamports / LAMPORTS_PER_SOL).toFixed(2)
}

function formatDuration(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export default function GameScreen({ gameAddress, onBack }: { gameAddress: Address; onBack: () => void }) {
  const { isConnected, account } = useConnector()
  const { openConnectModal } = useConnectWalletModal()
  const { game: chainGame, metadata, loading, error, refresh } = usePlinkoRaceGame(gameAddress)
  const actions = usePlinkoRaceActions()

  const [snapPlayers, setSnapPlayers] = React.useState<string[] | null>(null)
  const [snapWinner, setSnapWinner] = React.useState<number | null>(null)
  const [snapPayouts, setSnapPayouts] = React.useState<number[] | null>(null)
  const [replayDone, setReplayDone] = React.useState(false)

  const [wagerInput, setWagerInput] = React.useState('0.10')
  const [nameInput, setNameInput] = React.useState('')
  const [busyAction, setBusyAction] = React.useState<string | null>(null)
  const [actionError, setActionError] = React.useState<string | null>(null)

  const accountAddress = React.useMemo(() => {
    if (!account) return null
    return String((account as any).address ?? account)
  }, [account])

  const myPlayer = React.useMemo(() => {
    if (!chainGame || !accountAddress) return null
    return chainGame.players.find((player) => String(player.user) === accountAddress) ?? null
  }, [accountAddress, chainGame])

  const currentWager = Number(myPlayer?.wager ?? 0n)

  React.useEffect(() => {
    setSnapPlayers(null)
    setSnapWinner(null)
    setSnapPayouts(null)
    setReplayDone(false)
  }, [gameAddress])

  React.useEffect(() => {
    if (!chainGame) return

    if (Number(chainGame.wagerType) === Number(multiplayer.WagerType.SameWager)) {
      setWagerInput(toSolString(Number(chainGame.wager)))
      return
    }

    if (myPlayer) {
      setWagerInput(toSolString(Number(myPlayer.wager)))
      return
    }

    if (Number(chainGame.wager) > 0) {
      setWagerInput(toSolString(Number(chainGame.wager)))
    }
  }, [chainGame, myPlayer])

  React.useEffect(() => {
    if (!chainGame || snapPlayers) return
    if (Number(chainGame.state) !== Number(multiplayer.GameState.Settled)) return

    const winner = Number(chainGame.winnerIndexes[0] ?? 0)
    setSnapPlayers(chainGame.players.map((player) => String(player.user)))
    setSnapWinner(winner)
    setSnapPayouts(chainGame.players.map((player) => Number(player.pendingPayout ?? 0n)))
  }, [chainGame, snapPlayers])

  React.useEffect(() => {
    if (snapPlayers && snapPlayers.length === 0) {
      setReplayDone(true)
    }
  }, [snapPlayers])

  const [timeLeft, setTimeLeft] = React.useState(0)
  React.useEffect(() => {
    if (!chainGame?.softExpirationTimestamp) return

    const end = Number(chainGame.softExpirationTimestamp) * 1000
    const tick = () => setTimeLeft(Math.max(end - Date.now(), 0))

    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [chainGame?.softExpirationTimestamp])

  const waiting = snapPlayers === null
  const boardPlayers = waiting ? (chainGame?.players.map((player) => String(player.user)) ?? []) : snapPlayers
  const boardWinnerIdx = waiting ? null : snapWinner
  const boardPayouts = waiting ? undefined : snapPayouts ?? undefined

  React.useEffect(() => {
    clearTimeout(musicManager.timer)
    musicManager.count += 1

    return () => {
      musicManager.count -= 1
      if (musicManager.count === 0) {
        musicManager.timer = setTimeout(stopAndDispose, 200)
      }
    }
  }, [])

  const { play: playAction, sounds: actionSounds } = useSound(
    { action: actionSnd },
    { disposeOnUnmount: false },
  )

  React.useEffect(() => {
    if (!waiting) {
      try {
        musicManager.sound?.player?.stop?.()
      } catch {}

      const sound = actionSounds.action
      if (sound) {
        sound.player.loop = true
        const startWhenReady = () => {
          if (sound.ready) {
            playAction('action')
            attachMusic(sound)
          } else {
            setTimeout(startWhenReady, 100)
          }
        }
        startWhenReady()
      }
    }
  }, [actionSounds, playAction, waiting])

  const tokenMeta = React.useMemo(() => {
    const mint = chainGame ? String(chainGame.mint) : ''
    const config = TOKENS.find((entry) => String(entry.mint) === mint)

    return {
      symbol: config?.ticker ?? 'SOL',
      decimals: config?.decimals ?? 9,
      mint: (chainGame?.mint ?? ('So11111111111111111111111111111111111111112' as Address)) as Address,
    }
  }, [chainGame])

  const handleJoin = async () => {
    if (!chainGame) return

    if (!isConnected) {
      openConnectModal()
      return
    }

    const rawLamports = toLamports(wagerInput)
    const fixedWager = Number(chainGame.wager)
    const lamports = Number(chainGame.wagerType) === Number(multiplayer.WagerType.SameWager)
      ? fixedWager
      : clampLamports(rawLamports, chainGame.minBet, Number(chainGame.wagerType) === Number(multiplayer.WagerType.BetRange) ? chainGame.maxBet : undefined)

    setBusyAction('join')
    setActionError(null)

    try {
      await actions.joinGame({
        gameAccount: gameAddress,
        mint: tokenMeta.mint,
        wager: lamports,
        creatorAddress: PLATFORM_CREATOR_ADDRESS,
        creatorFeeBps: PLATFORM_CREATOR_FEE_BPS,
        metadata: nameInput.trim(),
      })
      await refresh()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to join game')
    } finally {
      setBusyAction(null)
    }
  }

  const handleIncreaseBet = async () => {
    if (!chainGame || !myPlayer) return

    const desired = clampLamports(toLamports(wagerInput), chainGame.minBet, chainGame.maxBet)
    const nextWager = Math.max(currentWager, desired)

    if (nextWager <= currentWager) {
      setActionError('Enter a wager above your current bet to increase it')
      return
    }

    setBusyAction('edit')
    setActionError(null)

    try {
      await actions.editBet({
        gameAccount: gameAddress,
        mint: tokenMeta.mint,
        wager: nextWager,
        creatorAddress: PLATFORM_CREATOR_ADDRESS,
        creatorFeeBps: PLATFORM_CREATOR_FEE_BPS,
        metadata: nameInput.trim(),
      })
      await refresh()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to increase bet')
    } finally {
      setBusyAction(null)
    }
  }

  const handleLeave = async () => {
    if (!chainGame || !myPlayer) return

    setBusyAction('leave')
    setActionError(null)

    try {
      await actions.leaveGame({
        gameAccount: gameAddress,
        mint: tokenMeta.mint,
      })
      await refresh()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to leave game')
    } finally {
      setBusyAction(null)
    }
  }

  const inWaitingState = Number(chainGame?.state) === Number(multiplayer.GameState.Waiting)
  const fixedWagerGame = Number(chainGame?.wagerType) === Number(multiplayer.WagerType.SameWager)
  const isJoined = Boolean(myPlayer)

  return (
    <>
      <Board
        players={boardPlayers}
        winnerIdx={boardWinnerIdx}
        gamePk={String(gameAddress)}
        payouts={boardPayouts}
        metadata={metadata}
        payoutSymbol={tokenMeta.symbol}
        payoutDecimals={tokenMeta.decimals}
        onFinished={!waiting ? () => setReplayDone(true) : undefined}
      />

      <div
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          zIndex: 200,
          textAlign: 'right',
        }}
      >
        <div
          style={{
            display: 'inline-block',
            background: 'rgba(0,0,0,0.6)',
            color: '#fff',
            padding: '4px 8px',
            borderRadius: 4,
            fontSize: 12,
            textTransform: 'uppercase',
          }}
        >
          {loading ? 'Loading' : waiting ? 'Waiting' : !replayDone ? 'Playing' : 'Settled'}
        </div>
        {waiting && timeLeft > 0 && (
          <div style={{ marginTop: 4, color: '#fff', fontSize: 12 }}>Starts in {formatDuration(timeLeft)}</div>
        )}
      </div>

      <GambaUi.Portal target="controls">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <GambaUi.Button onClick={onBack}>{'<'} Lobby</GambaUi.Button>

          {!loading && chainGame && waiting && inWaitingState && (
            <>
              {!isConnected ? (
                <GambaUi.Button main onClick={openConnectModal}>
                  Connect Wallet
                </GambaUi.Button>
              ) : !isJoined ? (
                <>
                  <CompactInput
                    value={wagerInput}
                    onChange={(event) => setWagerInput(event.target.value)}
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder={`Wager (${tokenMeta.symbol})`}
                    widthCh={7}
                    tokenMint={String(tokenMeta.mint)}
                    tokenSymbol={tokenMeta.symbol}
                    disabled={busyAction != null || Number(chainGame.wagerType) === Number(multiplayer.WagerType.SameWager)}
                  />
                  <CompactInput
                    value={nameInput}
                    onChange={(event) => setNameInput(event.target.value.slice(0, 10))}
                    type="text"
                    maxLength={10}
                    placeholder="Name (opt.)"
                    widthCh={10}
                    disabled={busyAction != null}
                  />
                  <GambaUi.Button main disabled={busyAction != null} onClick={() => void handleJoin()}>
                    {busyAction === 'join' ? 'Joining...' : 'Join'}
                  </GambaUi.Button>
                </>
              ) : (
                <>
                  <CompactInput
                    value={wagerInput}
                    onChange={(event) => setWagerInput(event.target.value)}
                    type="number"
                    min={0}
                    step={0.01}
                    placeholder={`Raise (${tokenMeta.symbol})`}
                    widthCh={7}
                    tokenMint={String(tokenMeta.mint)}
                    tokenSymbol={tokenMeta.symbol}
                    disabled={busyAction != null || fixedWagerGame}
                  />
                  <GambaUi.Button main disabled={busyAction != null || fixedWagerGame} onClick={() => void handleIncreaseBet()}>
                    {fixedWagerGame ? 'Fixed Wager' : busyAction === 'edit' ? 'Updating...' : 'Increase Bet'}
                  </GambaUi.Button>
                  <GambaUi.Button disabled={busyAction != null} onClick={() => void handleLeave()}>
                    {busyAction === 'leave' ? 'Leaving...' : 'Leave'}
                  </GambaUi.Button>
                </>
              )}
            </>
          )}

          {actionError && <div style={{ color: '#ff8888', fontSize: 12 }}>{actionError}</div>}
          {!actionError && error && <div style={{ color: '#ff8888', fontSize: 12 }}>{error}</div>}
        </div>
      </GambaUi.Portal>
    </>
  )
}
