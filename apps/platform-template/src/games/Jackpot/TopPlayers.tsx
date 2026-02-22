import React from 'react'
import styled, { css } from 'styled-components'
import { multiplayer } from '@gamba/core'

const LAMPORTS_PER_SOL = 1_000_000_000
const COMPACT_BREAKPOINT = 900

type Player = multiplayer.Player

interface TopPlayersProps {
  players: Player[]
  totalPot: number
  $isOverlay?: boolean
}

function useIsCompact(): boolean {
  const [isCompact, setIsCompact] = React.useState(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth <= COMPACT_BREAKPOINT
  })

  React.useEffect(() => {
    let timeoutId: number | null = null

    const onResize = () => {
      if (timeoutId != null) {
        window.clearTimeout(timeoutId)
      }
      timeoutId = window.setTimeout(() => {
        setIsCompact(window.innerWidth <= COMPACT_BREAKPOINT)
      }, 100)
    }

    window.addEventListener('resize', onResize)
    return () => {
      if (timeoutId != null) {
        window.clearTimeout(timeoutId)
      }
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return isCompact
}

const Container = styled.div<{ $isOverlay: boolean }>`
  position: relative;

  ${({ $isOverlay }) =>
    $isOverlay
      ? css`
          background: rgba(35, 35, 59, 0.8);
          backdrop-filter: blur(5px);
          border: 1px solid #4a4a7c;
          border-radius: 15px;
          padding: 10px;
        `
      : css`
          background: #23233b;
          border-radius: 15px;
          padding: 15px;
        `}

  height: 420px;
  overflow: hidden;

  @media (max-width: ${COMPACT_BREAKPOINT}px) {
    background: rgba(35, 35, 59, 0.5);
    backdrop-filter: blur(5px);
    border: 1px solid #4a4a7c;
    padding: 8px;
    height: auto;
  }
`

const Title = styled.h3`
  margin: 0 0 10px;
  color: #fff;
  font-size: 1rem;
  text-align: center;

  @media (max-width: ${COMPACT_BREAKPOINT}px) {
    display: none;
  }
`

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const PlayerItem = styled.li`
  display: flex;
  align-items: center;
  background: #2c2c54;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid #4a4a7c;

  @media (max-width: ${COMPACT_BREAKPOINT}px) {
    padding: 4px;
    border-radius: 6px;
  }
`

const PlayerRank = styled.div`
  font-size: 0.9rem;
  font-weight: bold;
  color: #f39c12;
  margin-right: 10px;
  min-width: 24px;
  text-align: center;

  @media (max-width: ${COMPACT_BREAKPOINT}px) {
    font-size: 0.8rem;
    margin-right: 6px;
    min-width: 20px;
  }
`

const PlayerInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

const PlayerAddress = styled.div`
  font-size: 0.8rem;
  color: #e0e0e0;
  font-family: monospace;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;

  @media (max-width: ${COMPACT_BREAKPOINT}px) {
    font-size: 0.7rem;
  }
`

const PlayerWager = styled.div`
  font-size: 0.8rem;
  color: #2ecc71;
  font-weight: bold;
  margin-top: 2px;

  @media (max-width: ${COMPACT_BREAKPOINT}px) {
    font-size: 0.7rem;
    margin-top: 1px;
  }
`

const Fade = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 40px;
  pointer-events: none;
  background: linear-gradient(rgba(35, 35, 59, 0), rgba(35, 35, 59, 1));

  @media (max-width: ${COMPACT_BREAKPOINT}px) {
    display: none;
  }
`

function shortAddress(address: string) {
  return `${address.slice(0, 4)}…${address.slice(-4)}`
}

export function TopPlayers({ players, totalPot, $isOverlay = false }: TopPlayersProps) {
  const isCompact = useIsCompact()

  const sorted = React.useMemo(() => {
    const all = [...players].sort((a, b) => Number(b.wager) - Number(a.wager))
    const maxCount = isCompact ? 3 : 7
    return all.slice(0, maxCount)
  }, [isCompact, players])

  return (
    <Container $isOverlay={$isOverlay}>
      {!$isOverlay && <Title>Top Players</Title>}

      <List>
        {sorted.map((player, index) => {
          const wager = Number(player.wager)
          const sol = wager / LAMPORTS_PER_SOL
          const pct = totalPot > 0 ? (wager / totalPot) * 100 : 0

          return (
            <PlayerItem key={`${String(player.user)}-${index}`}>
              <PlayerRank>#{index + 1}</PlayerRank>
              <PlayerInfo>
                <PlayerAddress>{shortAddress(String(player.user))}</PlayerAddress>
                <PlayerWager>
                  {sol.toFixed(2)} SOL • {pct.toFixed(1)} %
                </PlayerWager>
              </PlayerInfo>
            </PlayerItem>
          )
        })}
      </List>

      {!isCompact && players.length > 8 && <Fade />}
    </Container>
  )
}
