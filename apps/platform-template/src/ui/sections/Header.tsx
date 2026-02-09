import React from 'react'
import { NavLink } from 'react-router-dom'
import styled from 'styled-components'
import { ENABLE_LEADERBOARD, PLATFORM_CREATOR_ADDRESS } from '../../config/constants'
import { ConnectWallet } from '../components/ConnectWallet'
import { TokenSelect } from '../components/TokenSelect'
import { UiButton } from '../components/primitives'
import LeaderboardsModal from './LeaderBoard/LeaderboardsModal'

const StyledHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px;
  background: #000000cc;
  backdrop-filter: blur(20px);
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1000;
`

const Logo = styled(NavLink)`
  height: 35px;
  margin: 0 15px;

  & > img {
    height: 120%;
  }
`

const Right = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  position: relative;
`

const LeaderboardButton = styled(UiButton)`
  @media (max-width: 800px) {
    display: none;
  }
`

export function Header() {
  const [showLeaderboard, setShowLeaderboard] = React.useState(false)

  return (
    <>
      {ENABLE_LEADERBOARD && (
        <LeaderboardsModal open={showLeaderboard} onClose={() => setShowLeaderboard(false)} creator={String(PLATFORM_CREATOR_ADDRESS)} />
      )}

      <StyledHeader>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <Logo to="/">
            <img alt="Gamba logo" src="/logo.svg" />
          </Logo>
        </div>

        <Right>
          {ENABLE_LEADERBOARD && <LeaderboardButton onClick={() => setShowLeaderboard(true)}>Leaderboard</LeaderboardButton>}
          <TokenSelect />
          <ConnectWallet />
        </Right>
      </StyledHeader>
    </>
  )
}

export default Header
