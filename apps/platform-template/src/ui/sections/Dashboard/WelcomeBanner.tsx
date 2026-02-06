import React from 'react'
import styled from 'styled-components'
import { LANDING_ACTIONS, LANDING_HEADLINE, LANDING_SUBHEAD, type LandingAction } from '../../../config/constants'

const WelcomeWrapper = styled.div`
  @keyframes welcome-fade-in {
    from {
      opacity: 0;
    }

    to {
      opacity: 1;
    }
  }

  @keyframes backgroundGradient {
    0% {
      background-position: 0% 50%;
    }

    50% {
      background-position: 100% 50%;
    }

    100% {
      background-position: 0% 50%;
    }
  }

  background: linear-gradient(-45deg, #ffb07c, #ff3e88, #2969ff, #ef3cff, #ff3c87);
  background-size: 300% 300%;
  animation: welcome-fade-in 0.5s ease, backgroundGradient 30s ease infinite;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  text-align: center;
  filter: drop-shadow(0 4px 3px rgba(0, 0, 0, 0.07)) drop-shadow(0 2px 2px rgba(0, 0, 0, 0.06));

  @media (min-width: 800px) {
    display: grid;
    grid-template-columns: 2fr 1fr;
    align-items: center;
    text-align: left;
    padding: 40px;
    gap: 40px;
  }
`

const WelcomeContent = styled.div`
  h1 {
    font-size: 1.75rem;
    margin: 0 0 8px;
    color: #fff;
  }

  p {
    font-size: 1rem;
    color: #ffffffd1;
    margin: 0;
  }

  @media (min-width: 800px) {
    h1 {
      font-size: 2.25rem;
    }

    p {
      font-size: 1.125rem;
    }
  }
`

const ButtonGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;

  @media (min-width: 800px) {
    flex-direction: column;
    justify-content: flex-start;
  }
`

const ActionButton = styled.button`
  border: none;
  border-radius: 10px;
  padding: 12px 20px;
  font-size: 0.9rem;
  font-weight: 600;
  background: #ffffffdf;
  color: black;
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.2s ease;
  flex-grow: 1;
  text-align: center;

  &:hover {
    background: #fff;
    transform: translateY(-2px);
  }

  @media (min-width: 800px) {
    width: 100%;
    flex-grow: 0;
  }
`

function isRenderableAction(action: LandingAction) {
  if (action.type === 'open') return Boolean(action.href)
  if (action.type === 'copy') return Boolean(action.value)
  return false
}

export function WelcomeBanner() {
  const [copiedId, setCopiedId] = React.useState<string | null>(null)

  const visibleActions = React.useMemo(() => LANDING_ACTIONS.filter(isRenderableAction), [])

  const onAction = async (action: LandingAction) => {
    if (action.type === 'open' && action.href) {
      window.open(action.href, '_blank', 'noopener,noreferrer')
      return
    }

    if (action.type === 'copy' && action.value) {
      try {
        await navigator.clipboard.writeText(action.value)
        setCopiedId(action.id)
        window.setTimeout(() => setCopiedId((current) => (current === action.id ? null : current)), 1500)
      } catch {
        setCopiedId(null)
      }
    }
  }

  return (
    <WelcomeWrapper>
      <WelcomeContent>
        <h1>{LANDING_HEADLINE}</h1>
        <p>{LANDING_SUBHEAD}</p>
      </WelcomeContent>

      <ButtonGroup>
        {visibleActions.map((action) => (
          <ActionButton key={action.id} onClick={() => void onAction(action)}>
            {copiedId === action.id ? 'Copied' : action.label}
          </ActionButton>
        ))}
      </ButtonGroup>
    </WelcomeWrapper>
  )
}
