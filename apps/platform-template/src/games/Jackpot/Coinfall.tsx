import React from 'react'
import styled from 'styled-components'
import * as Matter from 'matter-js'
import { multiplayer } from '@gamba/core'
import { useSound } from '../../game-ui'
import joinSnd from './sounds/join.mp3'

const Container = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
`

type Player = multiplayer.Player

interface CoinfallsProps {
  players: Player[]
}

function usePrevious<T>(value: T) {
  const ref = React.useRef<T | undefined>(undefined)
  React.useEffect(() => {
    ref.current = value
  })
  return ref.current
}

const getRadiusForWager = (wagerLamports: number) => {
  const minWager = 0.01 * 1_000_000_000
  const maxWager = 5 * 1_000_000_000
  const minRadius = 10
  const maxRadius = 100

  if (wagerLamports <= minWager) return minRadius
  if (wagerLamports >= maxWager) return maxRadius

  const pct = (wagerLamports - minWager) / (maxWager - minWager)
  return minRadius + pct * (maxRadius - minRadius)
}

export function Coinfalls({ players }: CoinfallsProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const engineRef = React.useRef<Matter.Engine | null>(null)
  const prevPlayers = usePrevious(players) ?? []
  const { play: playJoin, sounds } = useSound({ join: joinSnd })

  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const engine = Matter.Engine.create({
      gravity: { y: 0.6 },
      enableSleeping: true,
    })
    engineRef.current = engine

    const render = Matter.Render.create({
      element: container,
      engine,
      options: {
        width: container.clientWidth,
        height: container.clientHeight,
        wireframes: false,
        background: 'transparent',
      },
    })

    const runner = Matter.Runner.create()
    Matter.Runner.run(runner, engine)
    Matter.Render.run(render)

    const thickness = 100
    const ground = Matter.Bodies.rectangle(
      container.clientWidth / 2,
      container.clientHeight + thickness / 2,
      container.clientWidth * 2,
      thickness,
      { isStatic: true, render: { visible: false } },
    )
    Matter.World.add(engine.world, ground)

    Matter.Events.on(engine, 'afterUpdate', () => {
      engine.world.bodies.forEach((body) => {
        if (!body.isStatic) {
          body.render.fillStyle = '#FFD700'
          body.render.opacity = 0.4
        }
      })
    })

    const handleResize = () => {
      if (!container || !render.canvas) return
      render.canvas.width = container.clientWidth
      render.canvas.height = container.clientHeight
      Matter.Body.setPosition(ground, {
        x: container.clientWidth / 2,
        y: container.clientHeight + thickness / 2,
      })
    }

    window.addEventListener('resize', handleResize)

    const backgroundSpawner = window.setInterval(() => {
      const width = container.clientWidth
      const x = Math.random() * width
      const radius = 6 + Math.random() * 4

      const smallCoin = Matter.Bodies.circle(x, -40, radius, {
        isSensor: true,
        collisionFilter: { mask: 0 },
        render: { fillStyle: '#FFD700', opacity: 0.15 },
        restitution: 0.2,
        friction: 0.02,
      })

      Matter.World.add(engine.world, smallCoin)
      window.setTimeout(() => Matter.World.remove(engine.world, smallCoin), 5000)
    }, 4000)

    return () => {
      window.clearInterval(backgroundSpawner)
      window.removeEventListener('resize', handleResize)
      Matter.Runner.stop(runner)
      Matter.Render.stop(render)
      Matter.Engine.clear(engine)
      if (render.canvas && render.canvas.parentNode) {
        render.canvas.parentNode.removeChild(render.canvas)
      }
      engineRef.current = null
    }
  }, [])

  React.useEffect(() => {
    const engine = engineRef.current
    const container = containerRef.current
    if (!engine || !container) return

    if (players.length <= prevPlayers.length) return

    const previousByAddress = new Set(prevPlayers.map((player) => String(player.user)))
    const newPlayers = players.filter((player) => !previousByAddress.has(String(player.user)))

    newPlayers.forEach((player) => {
      const width = container.clientWidth
      const radius = getRadiusForWager(Number(player.wager))
      const x = width * 0.2 + Math.random() * (width * 0.6)

      const coin = Matter.Bodies.circle(x, -30, radius, {
        restitution: 0.5,
        friction: 0.1,
        render: { fillStyle: '#FFD700' },
      })

      Matter.World.add(engine.world, coin)

      if (sounds.join?.ready) {
        playJoin('join')
      }
    })
  }, [playJoin, players, prevPlayers, sounds])

  return <Container ref={containerRef} />
}
