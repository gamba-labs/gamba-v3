import React from 'react'
import { multiplayer } from '@gamba/core'
import { useConnector } from '@solana/connector'
import type { Address } from '@solana/kit'
import { GambaUi } from '../../game-ui'
import { useConnectWalletModal } from '../../providers/ConnectWalletModalContext'
import { PLATFORM_CREATOR_ADDRESS, PLATFORM_CREATOR_FEE_BPS, TOKENS } from '../../config/constants'
import { CompactInput } from '../../ui/components/CompactInput'
import { usePlinkoRaceActions, usePlinkoRaceGame, usePlinkoRaceGames } from '../PlinkoRace/multiplayer'
import { Countdown } from './Countdown'
import { Pot } from './Pot'
import { WinnerAnimation } from './WinnerAnimation'
import { Coinfalls } from './Coinfall'
import { TopPlayers } from './TopPlayers'
import { RecentPlayers } from './RecentPlayers'
import { RecentGames } from './RecentGames'
import { Waiting } from './Waiting'
import { MyStats } from './MyStats'
import { DESIRED_CREATOR, DESIRED_MAX_PLAYERS, DESIRED_MINT, DESIRED_WINNERS_TARGET } from './config'
import * as S from './Jackpot.styles'

const LAMPORTS_PER_SOL = 1_000_000_000

type Phase = 'playing' | 'animation' | 'waiting'

function useMediaQuery(query: string) {
  const [matches, setMatches] = React.useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })

  React.useEffect(() => {
    const list = window.matchMedia(query)
    const onChange = () => setMatches(list.matches)

    onChange()
    list.addEventListener('change', onChange)
    return () => list.removeEventListener('change', onChange)
  }, [query])

  return matches
}

function accountToAddress(account: unknown): Address | null {
  if (!account) return null
  return String((account as any)?.address ?? account) as Address
}

function toLamports(solValue: string) {
  const value = Number(solValue)
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.round(value * LAMPORTS_PER_SOL))
}

function toSolString(lamports: number) {
  return (lamports / LAMPORTS_PER_SOL).toFixed(2)
}

function resolveWagerLamports(game: multiplayer.Game, inputLamports: number) {
  if (Number(game.wagerType) === Number(multiplayer.WagerType.SameWager)) {
    return Number(game.wager)
  }

  if (Number(game.wagerType) === Number(multiplayer.WagerType.BetRange)) {
    return Math.max(Number(game.minBet), Math.min(Number(game.maxBet), inputLamports))
  }

  return Math.max(1, inputLamports)
}

function JackpotControls({
  phase,
  waitingForPlayers,
  topGameAddress,
  game,
  myPlayer,
  onRefresh,
}: {
  phase: Phase
  waitingForPlayers: boolean
  topGameAddress: Address | null
  game: multiplayer.Game | null
  myPlayer: multiplayer.Player | null
  onRefresh: () => Promise<void>
}) {
  const { isConnected } = useConnector()
  const { openConnectModal } = useConnectWalletModal()
  const actions = usePlinkoRaceActions()

  const [wagerInput, setWagerInput] = React.useState('0.10')
  const [busy, setBusy] = React.useState<'join' | 'edit' | 'leave' | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const tokenSymbol = React.useMemo(() => {
    if (!game) return 'SOL'
    const config = TOKENS.find((entry) => String(entry.mint) === String(game.mint))
    return config?.ticker ?? 'SOL'
  }, [game])

  React.useEffect(() => {
    if (!game) return

    if (Number(game.wagerType) === Number(multiplayer.WagerType.SameWager)) {
      setWagerInput(toSolString(Number(game.wager)))
      return
    }

    if (myPlayer) {
      setWagerInput(toSolString(Number(myPlayer.wager)))
      return
    }

    if (Number(game.minBet) > 0) {
      setWagerInput(toSolString(Number(game.minBet)))
      return
    }

    setWagerInput('0.10')
  }, [game, myPlayer])

  const handleJoin = async () => {
    if (!game || !topGameAddress) return
    if (!isConnected) {
      openConnectModal()
      return
    }

    setBusy('join')
    setError(null)

    try {
      const lamports = resolveWagerLamports(game, toLamports(wagerInput))
      await actions.joinGame({
        gameAccount: topGameAddress,
        mint: game.mint as Address,
        wager: lamports,
        creatorAddress: PLATFORM_CREATOR_ADDRESS,
        creatorFeeBps: PLATFORM_CREATOR_FEE_BPS,
      })
      await onRefresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to join game')
    } finally {
      setBusy(null)
    }
  }

  const handleIncrease = async () => {
    if (!game || !topGameAddress || !myPlayer) return

    const currentLamports = Number(myPlayer.wager)
    const desired = resolveWagerLamports(game, toLamports(wagerInput))
    const nextLamports = Math.max(currentLamports, desired)

    if (nextLamports <= currentLamports) {
      setError('Enter a wager above your current bet to increase it')
      return
    }

    setBusy('edit')
    setError(null)

    try {
      await actions.editBet({
        gameAccount: topGameAddress,
        mint: game.mint as Address,
        wager: nextLamports,
        creatorAddress: PLATFORM_CREATOR_ADDRESS,
        creatorFeeBps: PLATFORM_CREATOR_FEE_BPS,
      })
      await onRefresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to edit bet')
    } finally {
      setBusy(null)
    }
  }

  const handleLeave = async () => {
    if (!game || !topGameAddress || !myPlayer) return

    setBusy('leave')
    setError(null)

    try {
      await actions.leaveGame({
        gameAccount: topGameAddress,
        mint: game.mint as Address,
      })
      await onRefresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to leave game')
    } finally {
      setBusy(null)
    }
  }

  const fixedWager = game ? Number(game.wagerType) === Number(multiplayer.WagerType.SameWager) : false

  if (phase !== 'playing' || !waitingForPlayers || !game || !topGameAddress) {
    return null
  }

  return (
    <>
      {!isConnected ? (
        <GambaUi.Button main onClick={openConnectModal}>
          Connect Wallet
        </GambaUi.Button>
      ) : !myPlayer ? (
        <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          <CompactInput
            value={wagerInput}
            onChange={(event) => setWagerInput(event.target.value)}
            type="number"
            min={0}
            step={0.01}
            disabled={busy != null || fixedWager}
            widthCh={7}
            tokenMint={String(game.mint)}
            tokenSymbol={tokenSymbol}
          />
          <GambaUi.Button main disabled={busy != null} onClick={() => void handleJoin()}>
            {busy === 'join' ? 'Joining...' : 'Join'}
          </GambaUi.Button>
        </div>
      ) : (
        <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          <CompactInput
            value={wagerInput}
            onChange={(event) => setWagerInput(event.target.value)}
            type="number"
            min={0}
            step={0.01}
            disabled={busy != null || fixedWager}
            widthCh={7}
            tokenMint={String(game.mint)}
            tokenSymbol={tokenSymbol}
          />
          <GambaUi.Button main disabled={busy != null || fixedWager} onClick={() => void handleIncrease()}>
            {fixedWager ? 'Fixed Wager' : busy === 'edit' ? 'Increasing...' : 'Increase Bet'}
          </GambaUi.Button>
          <GambaUi.Button disabled={busy != null} onClick={() => void handleLeave()}>
            {busy === 'leave' ? 'Leaving...' : 'Leave'}
          </GambaUi.Button>
        </div>
      )}

      {error && <div style={{ color: '#ff8888', fontSize: 12 }}>{error}</div>}
    </>
  )
}

export default function Jackpot() {
  const isSmall = useMediaQuery('(max-width: 900px)')
  const { account } = useConnector()
  const accountAddress = React.useMemo(() => accountToAddress(account), [account])

  const { games, loading: gamesLoading, refresh: refreshGames } = usePlinkoRaceGames(
    {
      creator: DESIRED_CREATOR,
      maxPlayers: DESIRED_MAX_PLAYERS,
      winnersTarget: DESIRED_WINNERS_TARGET,
      mint: DESIRED_MINT,
    },
    0,
  )

  const lastGameIdRef = React.useRef<bigint | null>(null)

  const topGame = React.useMemo(() => {
    for (const entry of games) {
      if (lastGameIdRef.current == null || entry.account.gameId !== lastGameIdRef.current) {
        return entry
      }
    }
    return null
  }, [games])

  const {
    game: liveGame,
    refresh: refreshLiveGame,
  } = usePlinkoRaceGame(topGame?.publicKey ?? null)

  const [phase, setPhase] = React.useState<Phase>('waiting')

  React.useEffect(() => {
    if (!liveGame) {
      setPhase('waiting')
      return
    }

    if (Number(liveGame.state) === Number(multiplayer.GameState.Settled)) {
      setPhase('animation')
      return
    }

    setPhase('playing')
  }, [liveGame])

  React.useEffect(() => {
    if (phase !== 'waiting') return

    void refreshGames()
    const interval = window.setInterval(() => {
      void refreshGames()
    }, 5000)

    return () => window.clearInterval(interval)
  }, [phase, refreshGames])

  const handleAnimationDone = React.useCallback(() => {
    if (liveGame) {
      lastGameIdRef.current = liveGame.gameId
    }
    setPhase('waiting')
    void refreshGames()
  }, [liveGame, refreshGames])

  const players = liveGame?.players ?? []
  const totalPotLamports = players.reduce((sum, player) => sum + Number(player.wager), 0)
  const waitingForPlayers = Number(liveGame?.state) === Number(multiplayer.GameState.Waiting)
  const settled = Number(liveGame?.state) === Number(multiplayer.GameState.Settled)

  const myEntry = React.useMemo(() => {
    if (!accountAddress) return null
    return players.find((player) => String(player.user) === accountAddress) ?? null
  }, [accountAddress, players])

  const myBetLamports = myEntry ? Number(myEntry.wager) : 0
  const myChancePct = totalPotLamports > 0 ? (myBetLamports / totalPotLamports) * 100 : 0

  const creationMs = liveGame ? Number(liveGame.creationTimestamp) * 1000 : 0
  const softMs = liveGame ? Number(liveGame.softExpirationTimestamp) * 1000 : 0
  const totalDurationMs = Math.max(softMs - creationMs, 0)

  const refreshAll = React.useCallback(async () => {
    await Promise.all([refreshGames(), refreshLiveGame()])
  }, [refreshGames, refreshLiveGame])

  return (
    <>
      <GambaUi.Portal target="screen">
        <S.ScreenLayout>
          <S.PageLayout>
            {!isSmall && (
              <S.TopPlayersSidebar>
                <TopPlayers players={players} totalPot={totalPotLamports} />
              </S.TopPlayersSidebar>
            )}

            <S.GameContainer>
              {liveGame && <Coinfalls players={players} />}

              {isSmall && players.length > 0 && (
                <S.TopPlayersOverlay>
                  <TopPlayers players={players} totalPot={totalPotLamports} $isOverlay />
                </S.TopPlayersOverlay>
              )}

              <S.MainContent>
                {!liveGame && (
                  <S.CenterBlock>
                    <Waiting />
                  </S.CenterBlock>
                )}

                {liveGame && (
                  <>
                    <S.Header>
                      <S.Title>Game #{String(liveGame.gameId)}</S.Title>
                      <S.Badge status={waitingForPlayers ? 'waiting' : settled ? 'settled' : 'live'}>
                        {waitingForPlayers ? 'Waiting' : settled ? 'Settled' : 'Live'}
                      </S.Badge>
                    </S.Header>

                    {totalDurationMs > 0 && (
                      <Countdown
                        creationTimestamp={creationMs}
                        softExpiration={softMs}
                        onComplete={() => {
                          // Passive timer display only.
                        }}
                      />
                    )}

                    <S.CenterBlock>
                      {phase === 'animation' && (
                        <WinnerAnimation
                          players={players}
                          winnerIndexes={liveGame.winnerIndexes.map(Number)}
                          currentUser={accountAddress}
                          onClose={handleAnimationDone}
                        />
                      )}

                      <Pot totalPot={totalPotLamports / LAMPORTS_PER_SOL} />

                      {myEntry && <MyStats betSOL={myBetLamports / LAMPORTS_PER_SOL} chancePct={myChancePct} />}
                    </S.CenterBlock>
                  </>
                )}
              </S.MainContent>
            </S.GameContainer>

            {!isSmall && (
              <S.RecentGamesSidebar>
                <RecentGames games={games} loading={gamesLoading} />
              </S.RecentGamesSidebar>
            )}
          </S.PageLayout>

          <S.RecentPlayersContainer>
            <RecentPlayers players={players} />
          </S.RecentPlayersContainer>
        </S.ScreenLayout>
      </GambaUi.Portal>

      <GambaUi.Portal target="controls">
        <JackpotControls
          phase={phase}
          waitingForPlayers={waitingForPlayers}
          topGameAddress={topGame?.publicKey ?? null}
          game={liveGame}
          myPlayer={myEntry}
          onRefresh={refreshAll}
        />
      </GambaUi.Portal>
    </>
  )
}
