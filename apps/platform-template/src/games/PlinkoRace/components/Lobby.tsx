import React from 'react'
import styled from 'styled-components'
import { useConnector } from '@solana/connector'
import { multiplayer } from '@gamba/core'
import type { Address } from '@solana/kit'
import { useSound } from '../../../game-ui'
import { TOKENS } from '../../../config/constants'
import { useConnectWalletModal } from '../../../providers/ConnectWalletModalContext'
import { usePlinkoRaceGames } from '../multiplayer'
import CreateGameModal from './CreateGameModal'
import LobbyBackground from './LobbyBackground'
import lobbymusicSnd from '../sounds/lobby.mp3'
import { attachMusic, musicManager, stopAndDispose, toggleMuted } from '../musicManager'

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  height: 100%;
  padding: 20px;
  position: relative;
  z-index: 2;
`

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
`

const Button = styled.button`
  border: none;
  border-radius: 8px;
  padding: 8px 12px;
  font-weight: 600;
  cursor: pointer;
  color: #fff;
  background: #1b1d2a;

  &:hover {
    background: #25283a;
  }
`

const ErrorCard = styled.div`
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(255, 87, 87, 0.15);
  border: 1px solid rgba(255, 87, 87, 0.4);
`

const TableWrap = styled.div`
  overflow: auto;
  border-radius: 10px;
  background: rgba(6, 8, 14, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.08);
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 700px;
`

const TH = styled.th`
  text-align: left;
  padding: 10px 12px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: rgba(255, 255, 255, 0.7);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
`

const TR = styled.tr<{ $clickable?: boolean }>`
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};

  &:hover {
    background: ${({ $clickable }) => ($clickable ? 'rgba(255, 255, 255, 0.06)' : 'transparent')};
  }
`

const TD = styled.td`
  padding: 10px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
`

const FooterButton = styled.button`
  position: absolute;
  right: 12px;
  bottom: 12px;
  z-index: 20;
  padding: 8px 12px;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  background: #1f2332;
  color: #fff;
  opacity: 0.9;
`

function formatDuration(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function truncateAddress(address: string) {
  return `${address.slice(0, 4)}...${address.slice(-4)}`
}

function formatTokenAmount(raw: bigint, decimals: number) {
  return (Number(raw) / Math.pow(10, decimals)).toFixed(2)
}

function getTokenMeta(mint: Address) {
  const token = TOKENS.find((entry) => String(entry.mint) === String(mint))
  if (token) {
    return {
      symbol: token.ticker,
      decimals: token.decimals ?? 9,
    }
  }

  return {
    symbol: 'SOL',
    decimals: 9,
  }
}

export default function Lobby({ onSelect }: { onSelect: (gameAddress: Address) => void }) {
  const { isConnected } = useConnector()
  const { openConnectModal } = useConnectWalletModal()
  const { games, loading, error, refresh } = usePlinkoRaceGames({ winnersTarget: 1 }, 5000)
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [now, setNow] = React.useState(Date.now())

  const { play, sounds } = useSound(
    { lobby: lobbymusicSnd },
    { disposeOnUnmount: false },
  )

  React.useEffect(() => {
    const sound = sounds.lobby

    clearTimeout(musicManager.timer)
    musicManager.count += 1

    if (!musicManager.sound) {
      sound.player.loop = true
      const startWhenReady = () => {
        if (sound.ready) {
          play('lobby')
          attachMusic(sound)
        } else {
          setTimeout(startWhenReady, 100)
        }
      }
      startWhenReady()
    }

    return () => {
      musicManager.count -= 1
      if (musicManager.count === 0) {
        musicManager.timer = setTimeout(stopAndDispose, 200)
      }
    }
  }, [play, sounds])

  React.useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  const openCreateGame = () => {
    if (!isConnected) {
      openConnectModal()
      return
    }
    setIsModalOpen(true)
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <LobbyBackground />

      <Wrapper>
        <Header>
          <Button onClick={openCreateGame}>+ Create Game</Button>
          <Button onClick={() => void refresh()}>{loading ? 'Loading...' : 'Refresh'}</Button>
        </Header>

        {error && <ErrorCard>{error}</ErrorCard>}

        <TableWrap>
          <Table>
            <thead>
              <tr>
                <TH>ID</TH>
                <TH>Maker</TH>
                <TH>Players</TH>
                <TH>Bet</TH>
                <TH>Status</TH>
              </tr>
            </thead>
            <tbody>
              {games.map((entry) => {
                const game = entry.account
                const tokenMeta = getTokenMeta(game.mint as Address)
                const waiting = Number(game.state) === Number(multiplayer.GameState.Waiting)

                let betLabel = 'Unknown'
                if (Number(game.wagerType) === Number(multiplayer.WagerType.SameWager)) {
                  betLabel = `${formatTokenAmount(game.wager, tokenMeta.decimals)} ${tokenMeta.symbol}`
                } else if (Number(game.wagerType) === Number(multiplayer.WagerType.CustomWager)) {
                  betLabel = 'Unlimited'
                } else {
                  betLabel = `${formatTokenAmount(game.minBet, tokenMeta.decimals)} - ${formatTokenAmount(game.maxBet, tokenMeta.decimals)} ${tokenMeta.symbol}`
                }

                const startMs = Number(game.softExpirationTimestamp) * 1000
                const msLeft = startMs - now
                const status = waiting
                  ? msLeft > 0
                    ? `Starts in ${formatDuration(msLeft)}`
                    : 'Ready to start'
                  : Number(game.state) === Number(multiplayer.GameState.Playing)
                    ? 'Playing'
                    : 'Settled'

                return (
                  <TR key={entry.publicKey} $clickable onClick={() => onSelect(entry.publicKey)}>
                    <TD>#{String(game.gameId)}</TD>
                    <TD>{truncateAddress(String(game.gameMaker))}</TD>
                    <TD>
                      {game.players.length}/{game.maxPlayers}
                    </TD>
                    <TD>{betLabel}</TD>
                    <TD>{status}</TD>
                  </TR>
                )
              })}

              {!loading && games.length === 0 && (
                <TR>
                  <TD colSpan={5} style={{ textAlign: 'center', opacity: 0.8 }}>
                    No live games yet. Create one to start.
                  </TD>
                </TR>
              )}
            </tbody>
          </Table>
        </TableWrap>

        <CreateGameModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      </Wrapper>

      <FooterButton onClick={toggleMuted}>
        {musicManager.muted ? 'Unmute Music' : 'Mute Music'}
      </FooterButton>
    </div>
  )
}
