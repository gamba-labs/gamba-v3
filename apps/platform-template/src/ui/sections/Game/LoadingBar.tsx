import React from 'react'
import styled, { css, keyframes } from 'styled-components'
import type { PlayPhase } from '../../../hooks/useGambaPlay'

type SegmentState = 'none' | 'loading' | 'finished'

const Container = styled.div`
  display: flex;
  width: 100%;
  gap: 5px;
`

const pulse = keyframes`
  0%, 100% { opacity: 0.6; }
  50% { opacity: 0.85; }
`

const Segment = styled.div<{ $state: SegmentState }>`
  flex-grow: 1;
  height: 6px;
  border-radius: 10px;
  background: var(--gamba-ui-primary-color);
  opacity: 0.2;

  ${({ $state }) =>
    $state === 'loading' &&
    css`
      animation: ${pulse} 1s ease infinite;
      opacity: 0.75;
    `}

  ${({ $state }) =>
    $state === 'finished' &&
    css`
      opacity: 0.85;
    `}
`

function phaseToStates(phase: PlayPhase): SegmentState[] {
  if (phase === 'signing') return ['loading', 'none', 'none']
  if (phase === 'sending') return ['finished', 'loading', 'none']
  if (phase === 'settling') return ['finished', 'finished', 'loading']
  if (phase === 'finished') return ['finished', 'finished', 'finished']
  return ['none', 'none', 'none']
}

export function LoadingBar({ phase }: { phase: PlayPhase }) {
  const [displayPhase, setDisplayPhase] = React.useState<PlayPhase>('idle')

  React.useEffect(() => {
    if (phase === 'finished') {
      setDisplayPhase('finished')
      const timeout = setTimeout(() => setDisplayPhase('idle'), 900)
      return () => clearTimeout(timeout)
    }
    setDisplayPhase(phase)
    return undefined
  }, [phase])

  const states = phaseToStates(displayPhase)

  return (
    <Container>
      {states.map((state, index) => (
        <Segment key={index} $state={state} />
      ))}
    </Container>
  )
}

