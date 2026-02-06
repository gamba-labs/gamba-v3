import React from 'react'
import styled, { css, keyframes } from 'styled-components'
import { TOKENS } from '../../config/constants'
import { useBalance } from '../../hooks/useBalance'
import { useToken } from '../../providers/TokenContext'
import { MenuItem, MenuPanel, MenuWrapper, UiButton } from './primitives'

const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }

  50% {
    opacity: 0.5;
  }
`

const TokenChip = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`

const TokenImage = styled.span<{ $image?: string }>`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: inline-grid;
  place-items: center;
  background: #2a2a38;
  color: #fff;
  font-size: 11px;
  font-weight: 700;

  ${({ $image }) =>
    $image &&
    css`
      background-image: url(${$image});
      background-size: cover;
      background-position: center;
      color: transparent;
    `}
`

const TokenTicker = styled.span`
  font-weight: 500;
`

const BalanceDisplay = styled.span<{ $updating?: boolean }>`
  font-variant-numeric: tabular-nums;
  min-width: 60px;
  text-align: right;

  ${(p) =>
    p.$updating &&
    css`
      animation: ${pulse} 0.5s ease;
    `}
`

const MenuMeta = styled.span`
  opacity: 0.7;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
`

export function TokenSelect() {
  const { tokens, selected, setSelected } = useToken()
  const { balances } = useBalance()

  const [open, setOpen] = React.useState(false)
  const [lastBalance, setLastBalance] = React.useState<string | null>(null)
  const [updating, setUpdating] = React.useState(false)
  const rootRef = React.useRef<HTMLDivElement>(null)

  const selectedCfg = React.useMemo(() => TOKENS.find((token) => token.id === selected.id), [selected.id])
  const currentBalance = balances[selected.id]

  React.useEffect(() => {
    if (lastBalance !== null && currentBalance !== lastBalance) {
      setUpdating(true)
      const t = setTimeout(() => setUpdating(false), 500)
      return () => clearTimeout(t)
    }

    setLastBalance(currentBalance ?? null)
  }, [currentBalance, lastBalance])

  React.useEffect(() => {
    if (!open) return

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current) return
      if (rootRef.current.contains(event.target as Node)) return
      setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <UiButton onClick={() => setOpen((value) => !value)} aria-haspopup="listbox" aria-expanded={open}>
        <TokenChip>
          <TokenImage $image={selectedCfg?.image}>{selected.ticker.slice(0, 1)}</TokenImage>
          <TokenTicker>{selected.ticker}</TokenTicker>
        </TokenChip>
        <BalanceDisplay $updating={updating}>{balances[selected.id] ?? '--'}</BalanceDisplay>
      </UiButton>

      {open && (
        <MenuWrapper>
          <MenuPanel>
            {tokens.map((token) => {
              const cfg = TOKENS.find((item) => item.id === token.id)
              return (
                <MenuItem
                  key={token.id}
                  onClick={() => {
                    setSelected(token)
                    setOpen(false)
                  }}
                >
                  <TokenChip>
                    <TokenImage $image={cfg?.image}>{token.ticker.slice(0, 1)}</TokenImage>
                    <TokenTicker>{token.ticker}</TokenTicker>
                  </TokenChip>
                  <MenuMeta>{balances[token.id] ?? '--'}</MenuMeta>
                </MenuItem>
              )
            })}
          </MenuPanel>
        </MenuWrapper>
      )}
    </div>
  )
}
