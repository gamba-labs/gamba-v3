import React from 'react'
import styled, { css } from 'styled-components'
import { TOKENS } from '../../../config/constants'
import { useBalance } from '../../../hooks/useBalance'
import { useToken } from '../../../providers/TokenContext'
import { formatTokenAmount, toLamports } from './tokenAmount'

const StyledPopup = styled.div`
  position: absolute;
  bottom: 100%;
  left: 0;
  width: max-content;
  display: flex;
  flex-direction: column;
  gap: 5px;
  border-radius: 10px;
  padding: 5px;
  color: var(--gamba-ui-input-color);
  background: var(--gamba-ui-input-background);
  white-space: nowrap;
  transform: translateY(-5px);
  z-index: 100;

  & > button {
    all: unset;
    box-sizing: border-box;
    cursor: pointer;
    font-size: inherit;
    padding: 5px;
    display: flex;
    align-items: center;
    gap: 8px;

    &:hover {
      background: var(--gamba-ui-input-background-hover);
    }

    &:disabled {
      cursor: default;
      opacity: 0.6;
    }
  }
`

const StyledWagerInput = styled.div<{ $edit: boolean }>`
  display: flex;
  justify-content: space-between;
  color: var(--gamba-ui-input-color);
  background: var(--gamba-ui-input-background);
  position: relative;
  border-radius: 10px;
  overflow: hidden;
  min-width: 170px;

  ${(props) =>
    props.$edit &&
    css`
      outline: #9564ff solid 1px;
      outline-offset: 1px;
    `}
`

const Flex = styled.button`
  all: unset;
  cursor: pointer;
  display: flex;
  align-items: center;
  flex-grow: 1;
  box-sizing: border-box;
`

const Input = styled.input`
  border: none;
  margin: 0;
  padding: 10px 0;
  color: var(--gamba-ui-input-color);
  background: var(--gamba-ui-input-background);
  outline: none;
  flex-grow: 1;

  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  &[type='number'] {
    -moz-appearance: textfield;
  }
`

const InputButton = styled.button`
  border: none;
  margin: 0;
  padding: 2px 10px;
  color: var(--gamba-ui-input-color);
  background: var(--gamba-ui-input-background);
  cursor: pointer;

  &:disabled {
    cursor: default;
    opacity: 0.6;
  }
`

const Buttons = styled.div`
  display: flex;
`

const TokenImage = styled.img`
  width: 25px;
  height: 25px;
  margin: 0 5px;
  border-radius: 50%;
  object-fit: cover;
  -webkit-user-drag: none;
`

const WagerAmount = styled.div`
  padding: 10px 0;
  width: 120px;
  opacity: 0.8;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
`

const Ticker = styled.span`
  font-size: 12px;
  opacity: 0.7;
`

export interface WagerInputProps {
  value: number
  onChange: (value: number) => void
  options?: number[]
  className?: string
  disabled?: boolean
  minValue?: number
  maxValue?: number
}

function toSafeNumber(value: bigint): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) return Number.MAX_SAFE_INTEGER
  if (value < BigInt(Number.MIN_SAFE_INTEGER)) return Number.MIN_SAFE_INTEGER
  return Number(value)
}

export function WagerInput(props: WagerInputProps) {
  const { selected } = useToken()
  const { rawBalances } = useBalance()
  const ref = React.useRef<HTMLDivElement>(null)

  const [isEditing, setIsEditing] = React.useState(false)
  const [input, setInput] = React.useState('')

  const token = React.useMemo(() => TOKENS.find((entry) => entry.id === selected.id), [selected.id])
  const decimals = token?.decimals ?? 0
  const ticker = token?.ticker ?? ''
  const tokenImage = token?.image ?? '/gamba.svg'
  const baseWager = Math.max(1, Math.round(token?.baseWager ?? Math.pow(10, Math.max(0, decimals))))
  const available = toSafeNumber(rawBalances[selected.id] ?? 0n)

  const clamp = React.useCallback(
    (next: number) => {
      if (!Number.isFinite(next)) return baseWager
      const maxValue = props.maxValue ?? available
      const minValue = props.minValue ?? 0
      return Math.max(minValue, Math.min(Math.round(next), Math.max(minValue, maxValue)))
    },
    [props.maxValue, props.minValue, available, baseWager],
  )

  React.useEffect(() => {
    if (!isEditing) return

    const onPointerDown = (event: MouseEvent) => {
      if (!ref.current) return
      if (ref.current.contains(event.target as Node)) return
      setIsEditing(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [isEditing])

  React.useEffect(() => {
    props.onChange(baseWager)
    setIsEditing(false)
  }, [selected.id, baseWager])

  const setPreset = (multiplier: number) => {
    props.onChange(clamp(multiplier * baseWager))
    setIsEditing(false)
  }

  const startEditInput = () => {
    if (props.disabled) return

    if (props.options) {
      setIsEditing((value) => !value)
      return
    }

    setIsEditing(true)
    setInput(String(props.value / Math.pow(10, decimals)))
  }

  const applyInput = () => {
    if (props.options) {
      setIsEditing(false)
      return
    }

    const parsed = Number(input)
    props.onChange(clamp(toLamports(parsed, decimals)))
    setIsEditing(false)
  }

  return (
    <div ref={ref} className={props.className} style={{ position: 'relative' }}>
      <StyledWagerInput $edit={isEditing}>
        <Flex onClick={startEditInput} disabled={props.disabled}>
          <TokenImage src={tokenImage} alt={ticker} />
          {!isEditing || props.options ? (
            <WagerAmount title={`${formatTokenAmount(props.value, decimals)} ${ticker}`}>
              <span>{formatTokenAmount(props.value, decimals)}</span>
              <Ticker>{ticker}</Ticker>
            </WagerAmount>
          ) : (
            <Input
              value={input}
              type="number"
              min={0}
              step={0.01}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => event.code === 'Enter' && applyInput()}
              onBlur={applyInput}
              disabled={props.disabled}
              autoFocus
              onFocus={(event) => event.target.select()}
            />
          )}
        </Flex>

        {!props.options && (
          <Buttons>
            <InputButton disabled={props.disabled} onClick={() => props.onChange(clamp(props.value / 2))}>
              x.5
            </InputButton>
            <InputButton disabled={props.disabled} onClick={() => props.onChange(clamp(props.value * 2))}>
              2x
            </InputButton>
          </Buttons>
        )}
      </StyledWagerInput>

      {props.options && isEditing && (
        <StyledPopup>
          {props.options.map((option, index) => (
            <button key={`${option}-${index}`} disabled={props.disabled} onClick={() => setPreset(option)}>
              <TokenImage src={tokenImage} alt={ticker} />
              <span>{formatTokenAmount(option * baseWager, decimals)}</span>
              <Ticker>{ticker}</Ticker>
            </button>
          ))}
        </StyledPopup>
      )}
    </div>
  )
}
