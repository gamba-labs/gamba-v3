import React from 'react'
import styled from 'styled-components'

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 10px 0;
  width: 100%;
`

const Time = styled.div`
  font-size: 2.5rem;
  color: #fff;
  font-weight: bold;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
  font-variant-numeric: tabular-nums;
`

const ProgressBar = styled.div`
  width: 100%;
  max-width: 500px;
  height: 10px;
  background: #2c2c54;
  border-radius: 5px;
  margin-top: 6px;
  overflow: hidden;
`

const Progress = styled.div`
  height: 100%;
  background: linear-gradient(90deg, #f39c12, #f1c40f);
  border-radius: 5px;
  transition: width 0.5s cubic-bezier(0.25, 1, 0.5, 1);
`

interface CountdownProps {
  creationTimestamp: number
  softExpiration: number
  onComplete: () => void
}

export const Countdown: React.FC<CountdownProps> = ({ creationTimestamp, softExpiration, onComplete }) => {
  const totalWindowRef = React.useRef(Math.max(softExpiration - creationTimestamp, 0))
  const [timeLeft, setTimeLeft] = React.useState(Math.max(softExpiration - Date.now(), 0))
  const firedRef = React.useRef(false)

  React.useEffect(() => {
    totalWindowRef.current = Math.max(softExpiration - creationTimestamp, 0)
    setTimeLeft(Math.max(softExpiration - Date.now(), 0))
    firedRef.current = false
  }, [creationTimestamp, softExpiration])

  React.useEffect(() => {
    if (timeLeft <= 0) {
      if (!firedRef.current) {
        firedRef.current = true
        onComplete()
      }
      return
    }

    const interval = window.setInterval(() => {
      setTimeLeft(Math.max(softExpiration - Date.now(), 0))
    }, 500)

    return () => window.clearInterval(interval)
  }, [onComplete, softExpiration, timeLeft])

  const totalSec = Math.ceil(timeLeft / 1000)
  const minutes = Math.floor(totalSec / 60)
  const seconds = totalSec % 60

  const pct =
    totalWindowRef.current > 0
      ? Math.min(100, ((totalWindowRef.current - timeLeft) / totalWindowRef.current) * 100)
      : 0

  return (
    <Wrapper>
      <Time>
        {minutes}:{seconds.toString().padStart(2, '0')}
      </Time>
      <ProgressBar>
        <Progress style={{ width: `${pct}%` }} />
      </ProgressBar>
    </Wrapper>
  )
}
