import React from 'react'
import styled from 'styled-components'
import { animate } from 'framer-motion'

function AnimatedNumber({ value }: { value: number }) {
  const animationRef = React.useRef<{ stop?: () => void } | null>(null)
  const [displayValue, setDisplayValue] = React.useState(value)

  React.useEffect(() => {
    if (animationRef.current) {
      animationRef.current.stop?.()
      animationRef.current = null
    }

    const animation = animate(displayValue, value, {
      duration: 0.5,
      ease: 'easeOut',
      onUpdate(latest) {
        setDisplayValue(latest)
      },
      onComplete() {
        setDisplayValue(value)
        animationRef.current = null
      },
    })

    animationRef.current = animation

    return () => {
      animation.stop()
      animationRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return <span>{displayValue.toFixed(2)}</span>
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 15px 0;
`

const Label = styled.div`
  font-size: 1rem;
  color: #e0e0e0;
`

const Value = styled.div`
  font-size: 3rem;
  line-height: 1.1;
  color: #f1c40f;
  font-weight: bold;
  text-shadow: 0 0 15px #f1c40f;

  @media (max-width: 900px) {
    font-size: 2.5rem;
  }
`

interface PotProps {
  totalPot: number
}

export function Pot({ totalPot }: PotProps) {
  return (
    <Wrapper>
      <Label>Total Pot</Label>
      <Value>
        <AnimatedNumber value={totalPot} /> SOL
      </Value>
    </Wrapper>
  )
}
