import React from 'react'
import styled, { keyframes, css } from 'styled-components'
import type { GameProps } from '../index'

// ─── Animations ───────────────────────────────────────────────────────────────

const coinFlip = keyframes`
  0% { transform: rotateY(0deg) rotateX(0deg); }
  25% { transform: rotateY(900deg) rotateX(15deg); }
  50% { transform: rotateY(1800deg) rotateX(-10deg); }
  75% { transform: rotateY(2700deg) rotateX(5deg); }
  100% { transform: rotateY(3600deg) rotateX(0deg); }
`

const coinBounce = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-30px); }
`

const glowPulse = keyframes`
  0%, 100% { box-shadow: 0 0 30px rgba(255, 215, 0, 0.4), 0 0 60px rgba(255, 215, 0, 0.2); }
  50% { box-shadow: 0 0 50px rgba(255, 215, 0, 0.6), 0 0 100px rgba(255, 215, 0, 0.3); }
`

const winGlow = keyframes`
  0% { box-shadow: 0 0 30px rgba(76, 175, 80, 0.6), 0 0 60px rgba(76, 175, 80, 0.3); }
  50% { box-shadow: 0 0 80px rgba(76, 175, 80, 0.8), 0 0 120px rgba(76, 175, 80, 0.4); }
  100% { box-shadow: 0 0 30px rgba(76, 175, 80, 0.6), 0 0 60px rgba(76, 175, 80, 0.3); }
`

const particleFloat = keyframes`
  0% { transform: translateY(0) rotate(0deg); opacity: 1; }
  100% { transform: translateY(-200px) rotate(720deg); opacity: 0; }
`

const shake = keyframes`
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
  20%, 40%, 60%, 80% { transform: translateX(5px); }
`

const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`

const scaleIn = keyframes`
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
`

// ─── Styled Components ────────────────────────────────────────────────────────

const Container = styled.div<{ $shake?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 32px;
  height: 100%;
  width: 100%;
  position: relative;
  ${p => p.$shake && css`animation: ${shake} 0.5s ease;`}
`

const CoinStage = styled.div`
  perspective: 1200px;
  width: 200px;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
`

const CoinOuter = styled.div<{ $flipping?: boolean; $result?: 'win' | 'lose' | null }>`
  width: 180px;
  height: 180px;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  
  ${p => !p.$flipping && !p.$result && css`
    animation: ${coinBounce} 2s ease-in-out infinite;
  `}
  
  ${p => p.$flipping && css`
    animation: ${coinFlip} 2s cubic-bezier(0.35, 0, 0.25, 1);
  `}
`

const CoinFace = styled.div<{ $back?: boolean; $result?: 'win' | 'lose' | null }>`
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  backface-visibility: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 72px;
  
  /* Default gold coin */
  background: linear-gradient(
    135deg,
    #ffd700 0%,
    #ffec8b 25%,
    #ffd700 50%,
    #daa520 75%,
    #ffd700 100%
  );
  box-shadow: 
    inset 0 4px 20px rgba(255, 255, 255, 0.5),
    inset 0 -4px 20px rgba(0, 0, 0, 0.3),
    0 10px 40px rgba(0, 0, 0, 0.4);
  
  /* 3D edge effect */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 8px solid;
    border-color: #daa520 #b8860b #b8860b #daa520;
    box-sizing: border-box;
  }
  
  /* Inner ring */
  &::after {
    content: '';
    position: absolute;
    inset: 15px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.3);
    box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.1);
  }
  
  ${p => !p.$back && !p.$result && css`
    animation: ${glowPulse} 2s ease-in-out infinite;
  `}
  
  ${p => p.$result === 'win' && css`
    background: linear-gradient(135deg, #4caf50 0%, #81c784 50%, #4caf50 100%);
    animation: ${winGlow} 1s ease-in-out infinite;
    &::before {
      border-color: #388e3c #2e7d32 #2e7d32 #388e3c;
    }
  `}
  
  ${p => p.$result === 'lose' && css`
    background: linear-gradient(135deg, #424242 0%, #616161 50%, #424242 100%);
    box-shadow: 
      inset 0 4px 20px rgba(255, 255, 255, 0.2),
      inset 0 -4px 20px rgba(0, 0, 0, 0.5),
      0 10px 40px rgba(0, 0, 0, 0.6);
    &::before {
      border-color: #616161 #424242 #424242 #616161;
    }
  `}
  
  ${p => p.$back && css`
    transform: rotateY(180deg);
  `}
`

const CoinSymbol = styled.span`
  position: relative;
  z-index: 1;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
`

const ResultDisplay = styled.div<{ $win?: boolean }>`
  text-align: center;
  animation: ${fadeInUp} 0.5s ease-out;
`

const ResultTitle = styled.div<{ $win?: boolean }>`
  font-size: 36px;
  font-weight: 800;
  letter-spacing: 2px;
  text-transform: uppercase;
  background: ${p => p.$win 
    ? 'linear-gradient(135deg, #4caf50, #81c784, #4caf50)' 
    : 'linear-gradient(135deg, #ef5350, #ff8a80, #ef5350)'};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: none;
  filter: drop-shadow(0 2px 10px ${p => p.$win ? 'rgba(76, 175, 80, 0.5)' : 'rgba(239, 83, 80, 0.5)'});
`

const PayoutAmount = styled.div<{ $win?: boolean }>`
  font-size: 24px;
  font-weight: 600;
  margin-top: 8px;
  color: ${p => p.$win ? '#81c784' : '#bdbdbd'};
  animation: ${scaleIn} 0.3s ease-out 0.2s both;
`

const MultiplierBadge = styled.div<{ $win?: boolean }>`
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 700;
  margin-top: 12px;
  background: ${p => p.$win ? 'rgba(76, 175, 80, 0.2)' : 'rgba(158, 158, 158, 0.2)'};
  color: ${p => p.$win ? '#4caf50' : '#9e9e9e'};
  border: 1px solid ${p => p.$win ? 'rgba(76, 175, 80, 0.3)' : 'rgba(158, 158, 158, 0.3)'};
  animation: ${scaleIn} 0.3s ease-out 0.4s both;
`

const IdleInfo = styled.div`
  text-align: center;
  animation: ${fadeInUp} 0.5s ease-out;
`

const GameTitle = styled.div`
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 4px;
  opacity: 0.5;
  margin-bottom: 8px;
`

const OddsDisplay = styled.div`
  font-size: 32px;
  font-weight: 700;
  background: linear-gradient(135deg, #ffd700, #ffec8b);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`

const OddsSubtext = styled.div`
  font-size: 14px;
  opacity: 0.6;
  margin-top: 4px;
`

const LoadingText = styled.div`
  font-size: 18px;
  font-weight: 500;
  opacity: 0.8;
  animation: ${fadeInUp} 0.3s ease-out;
`

// Win particles
const Particle = styled.div<{ $delay: number; $x: number }>`
  position: absolute;
  width: 10px;
  height: 10px;
  background: linear-gradient(135deg, #ffd700, #ffec8b);
  border-radius: 50%;
  animation: ${particleFloat} 1.5s ease-out forwards;
  animation-delay: ${p => p.$delay}ms;
  left: calc(50% + ${p => p.$x}px);
  top: 50%;
  pointer-events: none;
`

// ─── Component ────────────────────────────────────────────────────────────────

export default function Flip({ result, loading }: GameProps) {
  const [animating, setAnimating] = React.useState(false)
  const [showResult, setShowResult] = React.useState(false)
  const [showParticles, setShowParticles] = React.useState(false)

  // Trigger animation when loading starts
  React.useEffect(() => {
    if (loading) {
      setAnimating(true)
      setShowResult(false)
      setShowParticles(false)
    }
  }, [loading])

  // Show result after loading ends
  React.useEffect(() => {
    if (!loading && result) {
      const t = setTimeout(() => {
        setAnimating(false)
        setShowResult(true)
        if (result.win) {
          setShowParticles(true)
          setTimeout(() => setShowParticles(false), 1500)
        }
      }, 300)
      return () => clearTimeout(t)
    }
  }, [loading, result])

  const coinSymbol = React.useMemo(() => {
    if (animating) return '🪙'
    if (showResult && result) return result.win ? '👑' : '💀'
    return '🪙'
  }, [animating, showResult, result])

  const resultState = showResult && result ? (result.win ? 'win' : 'lose') : null

  const formatPayout = (amount: bigint, decimals = 9) => {
    const num = Number(amount) / Math.pow(10, decimals)
    return num.toFixed(4)
  }

  // Generate random particles for win effect
  const particles = React.useMemo(() => 
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      delay: i * 50,
      x: (Math.random() - 0.5) * 200,
    })), [showParticles]) // eslint-disable-line

  return (
    <Container $shake={!!(showResult && result && !result.win)}>
      {/* Win particles */}
      {showParticles && particles.map(p => (
        <Particle key={p.id} $delay={p.delay} $x={p.x} />
      ))}

      <CoinStage>
        <CoinOuter $flipping={animating} $result={resultState}>
          <CoinFace $result={resultState}>
            <CoinSymbol>{coinSymbol}</CoinSymbol>
          </CoinFace>
          <CoinFace $back $result={resultState}>
            <CoinSymbol>🎰</CoinSymbol>
          </CoinFace>
        </CoinOuter>
      </CoinStage>
      
      {showResult && result && (
        <ResultDisplay>
          <ResultTitle $win={result.win}>
            {result.win ? 'Winner!' : 'No Luck'}
          </ResultTitle>
          <PayoutAmount $win={result.win}>
            {result.win 
              ? `+${formatPayout(result.payout)} SOL` 
              : `-${formatPayout(result.wager)} SOL`
            }
          </PayoutAmount>
          <MultiplierBadge $win={result.win}>
            {result.win ? '2x Multiplier' : '0x Multiplier'}
          </MultiplierBadge>
        </ResultDisplay>
      )}
      
      {!loading && !result && (
        <IdleInfo>
          <GameTitle>Coin Flip</GameTitle>
          <OddsDisplay>2x or Nothing</OddsDisplay>
          <OddsSubtext>50% chance to double</OddsSubtext>
        </IdleInfo>
      )}
      
      {loading && !showResult && (
        <LoadingText>Flipping...</LoadingText>
      )}
    </Container>
  )
}
