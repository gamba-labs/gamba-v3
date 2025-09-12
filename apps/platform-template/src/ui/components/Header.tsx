import React from 'react'
import styled from 'styled-components'
import { ConnectWallet } from './ConnectWallet'
import { TokenSelect } from './TokenSelect'

const Bar = styled.header`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 16px;
  background: #000000cc;
  backdrop-filter: blur(20px);
`

const Left = styled.div`
  display: flex;
  gap: 20px;
  align-items: center;
`

const Logo = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 35px;
  margin: 0 15px;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  & > img { height: 120%; }
`

const Nav = styled.nav`
  display: flex;
  align-items: center;
  gap: 8px;
  button {
    appearance: none;
    border: 1px solid rgba(125, 125, 140, 0.35);
    background: transparent;
    color: inherit;
    padding: 6px 10px;
    border-radius: 8px;
    cursor: pointer;
  }
  button[aria-current='page'] {
    background: rgba(255, 255, 255, 0.1);
  }
`

export function Header({ route, onRoute }: { route: 'home' | 'game'; onRoute: (r: 'home' | 'game') => void }) {
  return (
    <Bar>
      <Left>
        <Logo onClick={() => onRoute('home')} aria-label="Home">
          <img alt="Gamba logo" src="/logo.svg" />
        </Logo>
      
      </Left>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <TokenSelect />
        <ConnectWallet />
      </div>
    </Bar>
  )
}


