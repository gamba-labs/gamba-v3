import React from 'react'
import styled, { keyframes, css } from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import { multiplayer } from '@gamba/core'
import { useSound } from '../../game-ui'
import tickSnd from './sounds/tick.mp3'
import winSnd from './sounds/win.mp3'

const winnerGlow = keyframes`
  0%, 100% { box-shadow: 0 0 15px 5px rgba(46, 204, 113, .7); transform: scale(1.1); }
  50% { box-shadow: 0 0 30px 10px rgba(46, 204, 113, 1); transform: scale(1.15); }
`

const Wrapper = styled(motion.div)`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: rgba(26, 26, 46, 0.9);
  backdrop-filter: blur(5px);
  z-index: 100;
`

const ReelContainer = styled.div`
  position: relative;
  width: 100%;
  max-width: 80vw;
  overflow-x: hidden;
  overflow-y: visible;
  padding: 40px 0;
  mask-image: linear-gradient(to right, transparent, black 20%, black 80%, transparent);
`

const Pointer = styled.div`
  position: absolute;
  top: 40px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: calc(100% - 80px);
  background: #f39c12;
  box-shadow: 0 0 10px #f39c12;
  border-radius: 2px;
  z-index: 2;
`

const PlayerReel = styled(motion.div)`
  display: flex;
`

const PlayerCard = styled.div<{ $isWinner: boolean; $isYou: boolean }>`
  position: relative;
  flex-shrink: 0;
  width: 100px;
  height: 120px;
  margin: 0 5px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #2c2c54;
  border: 2px solid #4a4a7c;
  border-radius: 10px;
  transition: .3s;

  ${({ $isYou, $isWinner }) =>
    $isYou &&
    !$isWinner &&
    css`
      border-color: #3498db;
      box-shadow: 0 0 10px 2px rgba(52, 152, 219, 0.6);
    `}

  ${({ $isWinner }) =>
    $isWinner &&
    css`
      border-color: #2ecc71;
      animation: ${winnerGlow} 1.5s ease-in-out infinite;
    `}
`

const YouBadge = styled.div`
  position: absolute;
  top: -10px;
  padding: 2px 8px;
  font-size: .7rem;
  font-weight: 700;
  color: #fff;
  background: #3498db;
  border-radius: 6px;
`

const Avatar = styled.div`
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: #4a4a7c;
  margin-bottom: 10px;
`

const PlayerAddress = styled.div`
  font-size: .8rem;
  color: #e0e0e0;
  font-family: monospace;
`

const BottomBar = styled.div`
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
`

const WinnerText = styled(motion.div)`
  font-size: 1.5rem;
  color: #fff;
  font-weight: bold;
  text-shadow: 0 0 10px #2ecc71;
`

type Player = multiplayer.Player

const TARGET = 100

function shortAddress(value: string) {
  return `${value.slice(0, 4)}…${value.slice(-4)}`
}

function buildReel(players: Player[], winnerIdx: number): Player[] {
  if (!players.length) return []

  const total = players.reduce((sum, player) => sum + Number(player.wager), 0)
  const tickets = 40
  const pool: Player[] = []

  players.forEach((player) => {
    const share = total > 0 ? Number(player.wager) / total : 0
    const count = Math.max(1, Math.round(share * tickets))
    for (let i = 0; i < count; i++) {
      pool.push(player)
    }
  })

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }

  const reel = Array.from({ length: TARGET * 2 }, (_, index) => pool[index % pool.length])
  reel[TARGET] = players[winnerIdx] ?? players[0]
  return reel
}

export const WinnerAnimation: React.FC<{
  players: Player[]
  winnerIndexes: number[]
  currentUser?: string | null
  onClose?: () => void
}> = ({ players, winnerIndexes, currentUser, onClose }) => {
  if (!players.length || winnerIndexes.length === 0) return null

  const winnerIdx = winnerIndexes[0]

  const frozenPlayers = React.useRef<Player[]>([])
  const frozenReel = React.useRef<Player[]>([])
  if (frozenReel.current.length === 0) {
    frozenPlayers.current = [...players]
    frozenReel.current = buildReel(frozenPlayers.current, winnerIdx)
  }

  const reel = frozenReel.current
  const snap = frozenPlayers.current

  const [closing, setClosing] = React.useState(false)
  const [spinDone, setSpinDone] = React.useState(false)
  const [winner, setWinner] = React.useState<Player | null>(null)
  const [offset, setOffset] = React.useState(0)

  const reelEl = React.useRef<HTMLDivElement>(null)
  const centersRef = React.useRef<number[]>([])
  const lastTickIndexRef = React.useRef<number | null>(null)

  React.useLayoutEffect(() => {
    const el = reelEl.current
    if (!el) return

    const card = el.children[TARGET] as HTMLElement | undefined
    if (card) {
      setOffset(-(card.offsetLeft + card.offsetWidth / 2 - el.clientWidth / 2))
    }

    const centers: number[] = []
    for (let i = 0; i < el.children.length; i++) {
      const child = el.children[i] as HTMLElement
      centers.push(child.offsetLeft + child.offsetWidth / 2)
    }
    centersRef.current = centers

    const pointerX = el.clientWidth / 2
    let nearest = 0
    let best = Number.POSITIVE_INFINITY

    centers.forEach((center, index) => {
      const distance = Math.abs(center - pointerX)
      if (distance < best) {
        best = distance
        nearest = index
      }
    })

    lastTickIndexRef.current = nearest
  }, [])

  React.useEffect(() => {
    if (!spinDone) return
    const timer = window.setTimeout(() => setWinner(snap[winnerIdx]), 1500)
    return () => window.clearTimeout(timer)
  }, [snap, spinDone, winnerIdx])

  React.useEffect(() => {
    if (!winner) return
    const timer = window.setTimeout(() => setClosing(true), 3000)
    return () => window.clearTimeout(timer)
  }, [winner])

  const { play: playSfx, sounds: sfx } = useSound({ tick: tickSnd, win: winSnd })

  React.useEffect(() => {
    if (!winner || !currentUser) return
    if (String(winner.user) !== currentUser) return
    if (sfx.win?.ready) {
      playSfx('win')
    }
  }, [currentUser, playSfx, sfx, winner])

  React.useEffect(() => {
    if (closing) {
      onClose?.()
    }
  }, [closing, onClose])

  const winnerAddress = winner ? String(winner.user) : ''

  return (
    <AnimatePresence>
      {!closing && (
        <Wrapper initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <ReelContainer>
            <Pointer />
            <PlayerReel
              ref={reelEl}
              initial={{ x: 0 }}
              animate={{ x: offset }}
              transition={{ duration: 6, ease: [0.22, 1, 0.36, 1], delay: 1 }}
              onUpdate={({ x }) => {
                const el = reelEl.current
                if (!el || typeof x !== 'number') return

                const pointerX = -x + el.clientWidth / 2
                const centers = centersRef.current
                if (!centers.length) return

                let nearest = 0
                let best = Number.POSITIVE_INFINITY
                for (let index = 0; index < centers.length; index++) {
                  const distance = Math.abs(centers[index] - pointerX)
                  if (distance < best) {
                    best = distance
                    nearest = index
                  }
                }

                if (nearest !== lastTickIndexRef.current) {
                  lastTickIndexRef.current = nearest
                  if (sfx.tick?.ready) {
                    playSfx('tick')
                  }
                }
              }}
              onAnimationComplete={() => setSpinDone(true)}
            >
              {reel.map((player, index) => {
                const address = String(player.user)
                const isWinner = address === winnerAddress && index === TARGET
                const isYou = !!currentUser && address === currentUser

                return (
                  <PlayerCard key={`${address}-${index}`} $isWinner={isWinner} $isYou={isYou}>
                    {isYou && !isWinner && <YouBadge>YOU</YouBadge>}
                    <Avatar />
                    <PlayerAddress>{shortAddress(address)}</PlayerAddress>
                  </PlayerCard>
                )
              })}
            </PlayerReel>
          </ReelContainer>

          <BottomBar>
            <AnimatePresence>
              {winner && (
                <WinnerText initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ delay: 0.2 }}>
                  Winner: {shortAddress(String(winner.user))}
                </WinnerText>
              )}
            </AnimatePresence>
          </BottomBar>
        </Wrapper>
      )}
    </AnimatePresence>
  )
}

export default WinnerAnimation
