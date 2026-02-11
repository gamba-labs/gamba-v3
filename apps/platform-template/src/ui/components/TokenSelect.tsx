import React from 'react'
import styled, { css, keyframes } from 'styled-components'
import { TOKENS, tokenImageCandidates } from '../../config/constants'
import { useBalance } from '../../hooks/useBalance'
import { useToken } from '../../providers/TokenContext'
import { MenuPanel, MenuWrapper, UiButton } from './primitives'

const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }

  50% {
    opacity: 0.5;
  }
`

const StyledToken = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`

const StyledTokenImage = styled.span`
  width: 20px;
  height: 20px;
  aspect-ratio: 1 / 1;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #2a2a38;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  overflow: hidden;
`

const StyledTokenImageImg = styled.img`
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
`

const StyledBalance = styled.span<{ $updating?: boolean }>`
  font-variant-numeric: tabular-nums;
  font-weight: 500;

  ${(props) =>
    props.$updating &&
    css`
      animation: ${pulse} 0.5s ease;
    `}
`

const StyledTokenButton = styled.button<{ $selected?: boolean }>`
  all: unset;
  box-sizing: border-box;
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px;
  border-radius: 7px;

  &:hover {
    background: #ffffff11;
  }

  ${(props) =>
    props.$selected &&
    css`
      background: #ffffff16;
    `}
`

const PoolLabel = styled.span`
  opacity: 0.65;
  font-size: 11px;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  margin-left: 8px;
  white-space: nowrap;
`

const BalanceWrap = styled.div`
  display: inline-flex;
  align-items: center;
`

const EmptyState = styled.span`
  opacity: 0.7;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
`

function TokenAvatar({ ticker, images }: { ticker: string; images?: string[] }) {
  const [imageIndex, setImageIndex] = React.useState(0)
  const key = React.useMemo(() => (images ?? []).join('|'), [images])
  const src = images?.[imageIndex]

  React.useEffect(() => {
    setImageIndex(0)
  }, [key])

  return (
    <StyledTokenImage>
      {src ? (
        <StyledTokenImageImg
          src={src}
          alt={ticker}
          onError={() => setImageIndex((value) => value + 1)}
        />
      ) : (
        ticker.slice(0, 1)
      )}
    </StyledTokenImage>
  )
}

export function TokenSelect() {
  const { pools, selected, selectedPoolOption, setSelectedPool } = useToken()
  const { balances } = useBalance()

  const [open, setOpen] = React.useState(false)
  const [lastBalance, setLastBalance] = React.useState<string | null>(null)
  const [updating, setUpdating] = React.useState(false)
  const rootRef = React.useRef<HTMLDivElement>(null)

  const tokenMap = React.useMemo(() => new Map(TOKENS.map((token) => [token.id, token])), [])
  const selectedCfg = tokenMap.get(selected.id)
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
        <StyledToken>
          <TokenAvatar
            ticker={selected.ticker}
            images={selectedCfg ? tokenImageCandidates(selectedCfg) : undefined}
          />
          <StyledBalance $updating={updating}>
            {(balances[selected.id] ?? '0')} {selected.ticker}
          </StyledBalance>
        </StyledToken>
      </UiButton>

      {open && (
        <MenuWrapper>
          <MenuPanel>
            {pools.length === 0 && <EmptyState>No pools configured.</EmptyState>}
            {pools.map((pool) => {
              const token = tokenMap.get(pool.tokenId)
              if (!token) return null
              const isSelected = selectedPoolOption.id === pool.id
              const isCustomLabel = pool.label && pool.label.trim().length > 0 && pool.label !== token.ticker

              const balance = balances[token.id] ?? '0'

              return (
                <StyledTokenButton
                  key={pool.id}
                  $selected={isSelected}
                  onClick={() => {
                    setSelectedPool(pool.id)
                    setOpen(false)
                  }}
                >
                  <StyledToken>
                    <TokenAvatar ticker={token.ticker} images={tokenImageCandidates(token)} />
                    <BalanceWrap>
                      {balance} {token.ticker}
                      {isCustomLabel && <PoolLabel>{pool.label}</PoolLabel>}
                    </BalanceWrap>
                  </StyledToken>
                </StyledTokenButton>
              )
            })}
          </MenuPanel>
        </MenuWrapper>
      )}
    </div>
  )
}
