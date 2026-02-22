import React from 'react'
import { useConnector } from '@solana/connector'
import { GambaUi } from '../../../game-ui'
import { useMultiPlinko } from '../hooks/useMultiPlinko'
import { BUCKET_DEFS, BucketType, DYNAMIC_SEQUENCE } from '../engine/constants'
import type { PlayerInfo } from '../engine/types'
import BoardHUD, { type HudMessage, type HudPayload } from './BoardHUD'
import BoardRenderer from './BoardRenderer'
import Scoreboard from './Scoreboard'

import extraBallSnd from '../sounds/extraball.mp3'
import readyGoSnd from '../sounds/readygo.mp3'
import fallSnd from '../sounds/fall.mp3'
import bigComboSnd from '../sounds/bigcombo.mp3'
import finishSnd from '../sounds/finsh.mp3'
import ouchSnd from '../sounds/ouch.mp3'

type Particle = { x: number; y: number; size: number; opacity: number; life: number; vx: number; vy: number }
type LerpState = { px: number; py: number }

type BoardProps = {
  players: string[]
  winnerIdx: number | null
  metadata?: Record<string, string>
  youIndexOverride?: number
  gamePk: string
  targetPoints?: number
  payouts?: number[]
  payoutSymbol?: string
  payoutDecimals?: number
  onFinished?: () => void
}

export default function Board({
  players,
  winnerIdx,
  metadata = {},
  youIndexOverride,
  gamePk,
  targetPoints = 100,
  payouts,
  payoutSymbol = 'SOL',
  payoutDecimals = 9,
  onFinished,
}: BoardProps) {
  const roster: PlayerInfo[] = React.useMemo(() => {
    const colors = [
      '#e6194B',
      '#3cb44b',
      '#ffe119',
      '#4363d8',
      '#f58231',
      '#911eb4',
      '#46f0f0',
      '#f032e6',
      '#bcf60c',
      '#fabebe',
      '#008080',
      '#e6beff',
      '#9a6324',
      '#fffac8',
      '#800000',
      '#aaffc3',
      '#808000',
      '#ffd8b1',
      '#000075',
      '#a9a9a9',
    ] as const

    return players.map((player, index) => ({
      id: player,
      color: colors[index % colors.length],
    }))
  }, [players])

  const { account } = useConnector()
  const accountAddress = React.useMemo(() => {
    if (!account) return null
    return String((account as any).address ?? account)
  }, [account])

  const youIdx = React.useMemo(
    () => youIndexOverride ?? roster.findIndex((entry) => entry.id === accountAddress),
    [accountAddress, roster, youIndexOverride],
  )

  const { engine, recordRace, replayRace } = useMultiPlinko(roster, gamePk)

  const [scores, setScores] = React.useState<number[]>([])
  const [mults, setMults] = React.useState<number[]>([])
  const [dynModes, setDynModes] = React.useState<number[]>([])
  const [started, setStarted] = React.useState(false)
  const [patternOffsets, setPatternOffsets] = React.useState<number[]>([])
  const [finished, setFinished] = React.useState(false)
  const [hud, setHud] = React.useState<HudPayload | null>(null)
  const [popups, setPopups] = React.useState<Array<{ bucketIndex: number; value: number; life: number; y: number }>>([])

  const showHud = React.useCallback((text: HudMessage) => {
    setHud({ text, key: Date.now() })
  }, [])

  const bucketAnim = React.useRef<Record<number, number>>({}).current
  const pegAnim = React.useRef<Record<number, number>>({}).current
  const particles = React.useRef<Particle[]>([]).current
  const arrowPos = React.useRef<Map<number, LerpState>>(new Map()).current
  const labelPos = React.useRef<Map<number, LerpState>>(new Map()).current

  const { play, sounds } = GambaUi.useSound(
    {
      ready: readyGoSnd,
      extra: extraBallSnd,
      fall: fallSnd,
      finish: finishSnd,
      bigcombo: bigComboSnd,
      ouch: ouchSnd,
    },
    { disposeOnUnmount: false },
  )

  const lastFallMsRef = React.useRef(0)

  React.useEffect(() => {
    setScores(Array(roster.length).fill(0))
    setMults(Array(roster.length).fill(1))
    setDynModes([])
    setStarted(false)
    setFinished(false)
    Object.keys(bucketAnim).forEach((key) => {
      bucketAnim[Number(key)] = 0
    })
    Object.keys(pegAnim).forEach((key) => {
      pegAnim[Number(key)] = 0
    })
    particles.length = 0
    arrowPos.clear()
    labelPos.clear()
  }, [arrowPos, bucketAnim, labelPos, particles, pegAnim, roster])

  React.useEffect(() => {
    if (finished) onFinished?.()
  }, [finished, onFinished])

  React.useEffect(() => {
    if (!engine || winnerIdx == null) return

    showHud('GO')
    if (sounds.ready?.ready) play('ready')
    setStarted(true)

    const recorded = recordRace(winnerIdx, targetPoints)
    const events = [...recorded.events]
    const runningMults = Array(roster.length).fill(1)

    replayRace(recorded, (frame) => {
      while (events.length && events[0]?.frame === frame) {
        const event = events.shift()!

        if (event.kind === 'bucketMode') {
          setDynModes((modes) => {
            const next = [...(modes.length ? modes : Array(BUCKET_DEFS.length).fill(0))]
            if (event.bucket !== undefined) {
              next[event.bucket] = event.value ?? 0
            } else {
              BUCKET_DEFS.forEach((bucket, index) => {
                if (bucket.type === BucketType.Dynamic) next[index] = event.value ?? 0
              })
            }
            return next
          })

          if (event.bucket !== undefined) {
            bucketAnim[event.bucket] = 1
          } else {
            BUCKET_DEFS.forEach((bucket, index) => {
              if (bucket.type === BucketType.Dynamic) bucketAnim[index] = 1
            })
          }

          continue
        }

        if (event.kind === 'bucketPattern' && event.bucket !== undefined) {
          setPatternOffsets((offsets) => {
            const dynamicIndexes = BUCKET_DEFS.map((bucket, index) => (bucket.type === BucketType.Dynamic ? index : -1)).filter(
              (index) => index >= 0,
            )
            const mapIndex = dynamicIndexes.indexOf(event.bucket!)
            const next = [...(offsets.length ? offsets : Array(dynamicIndexes.length).fill(0))]
            if (mapIndex >= 0) next[mapIndex] = event.value ?? 0
            return next
          })
          continue
        }

        if (event.bucket !== undefined) {
          const bucketIndex = event.bucket
          bucketAnim[bucketIndex] = 1

          const now = performance.now()
          if (sounds.fall?.ready && now - lastFallMsRef.current > 60) {
            lastFallMsRef.current = now
            play('fall')
          }

          if (event.kind === 'extraBall') {
            showHud('EXTRA BALL')
            if (sounds.extra?.ready) play('extra')
          }

          const bucket = BUCKET_DEFS[bucketIndex]
          const mode = dynModes[bucketIndex] ?? 0
          const resolvedType = bucket.type === BucketType.Dynamic ? DYNAMIC_SEQUENCE[mode] : bucket.type

          if (resolvedType === BucketType.ExtraBall && event.kind !== 'extraBall') {
            showHud('EXTRA BALL')
            if (sounds.extra?.ready) play('extra')
          }
        }

        if (event.kind === 'mult') {
          const increment = event.value || 1
          const current = runningMults[event.player]
          runningMults[event.player] = Math.min((current === 1 ? 0 : current) + increment, 64)

          setMults((currentMults) => {
            const next = [...currentMults]
            next[event.player] = runningMults[event.player]
            return next
          })

          if (runningMults[event.player] >= 5) {
            showHud('BIG COMBO')
            if (sounds.bigcombo?.ready) play('bigcombo')
          }
        }

        if (event.kind === 'deduct') {
          showHud('DEDUCTION')
          if (sounds.ouch?.ready) play('ouch')

          setScores((currentScores) => {
            const next = [...currentScores]
            next[event.player] = Math.max(0, (next[event.player] ?? 0) - (event.value || 0))
            return next
          })

          if (event.bucket !== undefined) {
            setPopups((currentPopups) => [
              { bucketIndex: event.bucket!, value: -(event.value || 0), life: 30, y: 0 },
              ...currentPopups,
            ])
          }
        }

        if (event.kind === 'score') {
          setScores((currentScores) => {
            const next = [...currentScores]
            next[event.player] += event.value || 0
            return next
          })

          runningMults[event.player] = 1
          setMults((currentMults) => {
            const next = [...currentMults]
            next[event.player] = 1
            return next
          })

          if (event.bucket !== undefined) {
            setPopups((currentPopups) => [
              { bucketIndex: event.bucket!, value: event.value || 0, life: 30, y: 0 },
              ...currentPopups,
            ])
          }
        }

        if (event.kind === 'ballKill') {
          showHud('PLAYER OUT')
        }
      }

      if (frame === recorded.totalFrames - 1) {
        if (sounds.finish?.ready) play('finish')
        setFinished(true)
      }
    })
  }, [dynModes, engine, play, recordRace, replayRace, roster.length, showHud, sounds, targetPoints, winnerIdx, bucketAnim])

  if (roster.length === 0 && winnerIdx !== null) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          color: '#fff',
          background: '#0b0b13',
        }}
      >
        Game settled with 0 players
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <BoardRenderer
        engine={engine}
        dynModes={dynModes}
        patternOffsets={patternOffsets}
        started={started}
        bucketAnim={bucketAnim}
        pegAnim={pegAnim}
        particles={particles}
        arrowPos={arrowPos}
        labelPos={labelPos}
        mults={mults}
        roster={roster}
        metadata={metadata}
        youIdx={youIdx}
        popups={popups}
      />

      <Scoreboard
        roster={roster}
        scores={scores}
        mults={mults}
        targetPoints={targetPoints}
        final={finished}
        payouts={payouts}
        metadata={metadata}
        payoutSymbol={payoutSymbol}
        payoutDecimals={payoutDecimals}
      />

      <BoardHUD message={hud} />
    </div>
  )
}
