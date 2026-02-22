import React from 'react'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import { multiplayer } from '@gamba/core'
import type { MultiplayerGameAccount } from '../PlinkoRace/multiplayer'

const LAMPORTS_PER_SOL = 1_000_000_000

const Container = styled.div`
  background: #23233b;
  border-radius: 15px;
  padding: 15px;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
`

const Header = styled.header`
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 10px;
  flex-shrink: 0;

  h3 {
    margin: 0;
    font-size: 1rem;
    color: #fff;
  }
`

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  flex-grow: 1;

  &::-webkit-scrollbar {
    width: 0;
    background: transparent;
  }
`

const GameItem = styled(motion.li)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #2c2c54;
  padding: 4px 8px;
  border-radius: 8px;
  border: 1px solid #4a4a7c;
  margin-bottom: 4px;
  font-size: 0.8rem;
  white-space: nowrap;
`

const GameId = styled.div`
  font-family: monospace;
  color: #a9a9b8;
  flex: 0 0 auto;
`

const PotSize = styled.div`
  flex: 1 1 auto;
  text-align: center;
  color: #e0e0e0;
`

const Multiplier = styled.div`
  font-family: monospace;
  text-align: right;
  color: #2ecc71;
  font-weight: bold;
  flex: 0 0 auto;
`

const EmptyState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #a9a9b8;
  font-size: 0.9rem;
`

const Fade = styled.div`
  position: absolute;
  bottom: 15px;
  left: 15px;
  right: 15px;
  height: 40px;
  pointer-events: none;
  background: linear-gradient(rgba(35, 35, 59, 0), rgba(35, 35, 59, 1));
`

function format2(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function getSettledGames(games: MultiplayerGameAccount[]) {
  return games
    .filter((entry) => Number(entry.account.state) === Number(multiplayer.GameState.Settled))
    .slice(0, 20)
}

export function RecentGames({ games, loading }: { games: MultiplayerGameAccount[]; loading: boolean }) {
  const settledGames = React.useMemo(() => getSettledGames(games), [games])

  return (
    <Container>
      <Header>
        <h3>Recent Games</h3>
      </Header>
      <List>
        <AnimatePresence initial={false}>
          {settledGames.length > 0 ? (
            settledGames.map((entry) => {
              const game = entry.account
              const totalWager = game.players.reduce((sum, player) => sum + Number(player.wager), 0)
              const winnerIndex = Number(game.winnerIndexes[0] ?? 0)
              const winner = game.players[winnerIndex]
              const winnerWager = winner ? Number(winner.wager) : 0
              const winnerPayout = winner ? Number(winner.pendingPayout) : 0
              const fallbackPayout = totalWager
              const usedPayout = winnerPayout > 0 ? winnerPayout : fallbackPayout
              const multiplier = winnerWager > 0 ? usedPayout / winnerWager : 0

              return (
                <GameItem
                  key={entry.publicKey}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                >
                  <GameId>#{String(game.gameId)}</GameId>
                  <PotSize>{format2(totalWager / LAMPORTS_PER_SOL)} SOL</PotSize>
                  <Multiplier>×{format2(multiplier)}</Multiplier>
                </GameItem>
              )
            })
          ) : (
            <EmptyState>{loading ? 'Loading...' : 'No recent games'}</EmptyState>
          )}
        </AnimatePresence>
      </List>
      <Fade />
    </Container>
  )
}

export default RecentGames
