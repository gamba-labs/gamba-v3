import styled, { css, keyframes } from 'styled-components'

const menuAppear = keyframes`
  from {
    opacity: 0;
    transform: translateY(-8px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
`

export const UiButton = styled.button<{ $main?: boolean; $small?: boolean }>`
  --color: var(--gamba-ui-button-default-color);
  --background-color: var(--gamba-ui-button-default-background);
  --background-color-hover: var(--gamba-ui-button-default-background-hover);

  ${({ $main }) =>
    $main &&
    css`
      --background-color: var(--gamba-ui-button-main-background);
      --color: var(--gamba-ui-button-main-color);
      --background-color-hover: var(--gamba-ui-button-main-background-hover);
    `}

  background: var(--background-color);
  color: var(--color);
  border: none;
  border-radius: var(--gamba-ui-border-radius);
  padding: ${({ $small }) => ($small ? '6px 10px' : '10px 12px')};
  min-height: ${({ $small }) => ($small ? '34px' : '40px')};
  font-size: 14px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  text-align: center;
  transition: background 0.15s ease, transform 0.15s ease;

  &:hover {
    background: var(--background-color-hover);
  }

  &:disabled {
    cursor: default;
    opacity: 0.7;
    transform: none;
  }
`

export const MenuWrapper = styled.div`
  position: absolute;
  right: 0;
  top: 100%;
  margin-top: 10px;
  z-index: 1200;
  min-width: max-content;
`

export const MenuPanel = styled.div`
  display: grid;
  background: #15151f;
  border-radius: 10px;
  overflow: hidden;
  padding: 6px;
  gap: 4px;
  border: 1px solid rgba(125, 125, 140, 0.25);
  animation: ${menuAppear} 0.18s ease;
`

export const MenuItem = styled.button`
  all: unset;
  box-sizing: border-box;
  cursor: pointer;
  font-size: inherit;
  padding: 8px 10px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: space-between;

  &:hover {
    background: var(--gamba-ui-input-background-hover);
  }

  &:disabled {
    cursor: default;
    opacity: 0.6;
  }
`

export const MenuInfo = styled.div`
  font-size: 12px;
  opacity: 0.7;
  padding: 8px 10px;
  word-break: break-all;
`

export const MenuDivider = styled.div`
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 2px 4px;
`
