import React from 'react'
import styled, { keyframes, css } from 'styled-components'
import { useToken } from '../../providers/TokenContext'
import { useBalance } from '../../hooks/useBalance'

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`

const Btn = styled.button`
  appearance: none;
  border: 1px solid rgba(125,125,140,0.35);
  background: transparent;
  color: inherit;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
`

const BalanceDisplay = styled.span<{ $updating?: boolean }>`
  font-variant-numeric: tabular-nums;
  min-width: 60px;
  text-align: right;
  transition: color 0.2s;
  ${p => p.$updating && css`animation: ${pulse} 0.5s ease;`}
`

const Dropdown = styled.div`
  position: absolute;
  left: 0;
  margin-top: 6px;
  background: var(--bg);
  color: var(--fg);
  border: 1px solid rgba(125,125,140,0.35);
  border-radius: 8px;
  min-width: 180px;
  overflow: hidden;
  z-index: 100;
`

const TokenButton = styled.button`
  width: 100%;
  padding: 10px 12px;
  background: transparent;
  color: inherit;
  border: none;
  text-align: left;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  transition: background 0.15s;
  
  &:hover {
    background: rgba(125,125,140,0.1);
  }
`

const TokenName = styled.span`
  font-weight: 500;
`

const TokenBalance = styled.span`
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

  // Flash effect when balance changes
  const currentBalance = balances[selected.id]
  React.useEffect(() => {
    if (lastBalance !== null && currentBalance !== lastBalance) {
      setUpdating(true)
      const t = setTimeout(() => setUpdating(false), 500)
      return () => clearTimeout(t)
    }
    setLastBalance(currentBalance ?? null)
  }, [currentBalance, lastBalance])

  return (
    <div style={{ position: 'relative' }}>
      <Btn onClick={() => setOpen((v) => !v)} aria-haspopup="listbox" aria-expanded={open}>
        <span>{selected.ticker}</span>
        <BalanceDisplay $updating={updating}>
          {balances[selected.id] ?? '—'}
        </BalanceDisplay>
      </Btn>
      {open && (
        <Dropdown>
          {tokens.map((t) => (
            <TokenButton
              key={t.id}
              onClick={() => { setSelected(t); setOpen(false) }}
            >
              <TokenName>{t.ticker}</TokenName>
              <TokenBalance>{balances[t.id] ?? '—'}</TokenBalance>
            </TokenButton>
          ))}
        </Dropdown>
      )}
    </div>
  )
}
