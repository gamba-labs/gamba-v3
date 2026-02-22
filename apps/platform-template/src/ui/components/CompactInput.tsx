import React from 'react'
import styled, { css } from 'styled-components'
import { TOKENS } from '../../config/constants'
import { useTokenLogo } from '../../hooks/useTokenLogos'

const Root = styled.label<{ $disabled: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 10px;
  box-sizing: border-box;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: var(--gamba-ui-input-background);
  color: var(--gamba-ui-input-color);
  min-width: 0;
  width: fit-content;
  transition: border-color 0.15s ease, opacity 0.15s ease;

  &:focus-within {
    border-color: var(--gamba-ui-primary-color);
  }

  ${({ $disabled }) =>
    $disabled &&
    css`
      opacity: 0.7;
      cursor: not-allowed;
    `}
`

const FieldInput = styled.input<{ $widthCh: number }>`
  width: ${({ $widthCh }) => `${$widthCh}ch`};
  min-width: ${({ $widthCh }) => `${$widthCh}ch`};
  max-width: ${({ $widthCh }) => `${$widthCh}ch`};
  border: none;
  margin: 0;
  padding: 0;
  background: transparent;
  color: inherit;
  outline: none;
  font-size: 16px;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  text-align: left;

  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  &[type='number'] {
    -moz-appearance: textfield;
  }
`

const TokenIcon = styled.img`
  width: 18px;
  height: 18px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  -webkit-user-drag: none;
`

const Symbol = styled.span`
  font-size: 12px;
  opacity: 0.75;
  line-height: 1;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  flex-shrink: 0;
`

export type CompactInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  widthCh?: number
  tokenMint?: string
  tokenSymbol?: string
  tokenImage?: string
}

export function CompactInput({
  widthCh = 7,
  tokenMint,
  tokenSymbol,
  tokenImage,
  type = 'number',
  ...inputProps
}: CompactInputProps) {
  const normalizedMint = tokenMint ? String(tokenMint) : undefined
  const configuredToken = React.useMemo(
    () => (normalizedMint ? TOKENS.find((token) => String(token.mint) === normalizedMint) : undefined),
    [normalizedMint],
  )

  const symbol = tokenSymbol ?? configuredToken?.ticker
  const fallbackImage = tokenImage ?? configuredToken?.image ?? '/gamba.svg'
  const logo = useTokenLogo(normalizedMint, fallbackImage) ?? fallbackImage
  const showToken = Boolean(normalizedMint || tokenImage)

  return (
    <Root $disabled={Boolean(inputProps.disabled)}>
      {showToken && <TokenIcon src={logo} alt={symbol ?? 'Token'} draggable={false} />}
      <FieldInput {...inputProps} type={type} $widthCh={widthCh} />
      {symbol && <Symbol>{symbol}</Symbol>}
    </Root>
  )
}
