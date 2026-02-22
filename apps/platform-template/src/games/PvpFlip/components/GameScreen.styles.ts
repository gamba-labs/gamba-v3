import styled, { css } from 'styled-components'

type Tone = 'heads' | 'tails'

export const HudRoot = styled.div`
  position: absolute;
  left: 50%;
  bottom: 18px;
  transform: translateX(-50%);
  color: #ddd;
  font-size: 12px;
  width: min(860px, calc(100% - 16px));
  pointer-events: none;

  @media (max-width: 720px) {
    bottom: 10px;
  }
`

export const InfoRail = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 18px;
  background: linear-gradient(180deg, rgba(20, 20, 30, 0.78), rgba(12, 12, 20, 0.68));
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 10px 35px rgba(0, 0, 0, 0.35);

  @media (max-width: 920px) {
    gap: 12px;
    padding: 10px 12px;
  }

  @media (max-width: 720px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    padding: 10px;
  }
`

export const SideCard = styled.div<{
  $tone: Tone
  $present: boolean
  $winner: boolean
}>`
  display: flex;
  align-items: center;
  gap: 10px;
  opacity: ${({ $present }) => ($present ? 1 : 0.6)};
  border-radius: 12px;
  padding: 8px 10px;
  border: 1px solid transparent;

  ${({ $tone }) =>
    $tone === 'heads'
      ? css`
          background: linear-gradient(180deg, rgba(66, 255, 120, 0.08), rgba(66, 255, 120, 0.02));
          border-color: rgba(66, 255, 120, 0.16);
        `
      : css`
          background: linear-gradient(180deg, rgba(98, 134, 255, 0.08), rgba(98, 134, 255, 0.02));
          border-color: rgba(98, 134, 255, 0.16);
        `}

  ${({ $winner }) =>
    $winner &&
    css`
      box-shadow: 0 0 18px rgba(66, 255, 120, 0.22);
    `}

  @media (max-width: 720px) {
    min-width: 0;
    gap: 8px;
    padding: 8px;
  }
`

export const SideIconFrame = styled.div<{ $tone: Tone }>`
  width: 28px;
  height: 28px;
  border-radius: 999px;
  overflow: hidden;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid
    ${({ $tone }) => ($tone === 'heads' ? 'rgba(66, 255, 120, 0.35)' : 'rgba(98, 134, 255, 0.35)')};

  @media (max-width: 720px) {
    width: 24px;
    height: 24px;
  }
`

export const SideIcon = styled.img`
  height: 18px;
  width: 18px;
  object-fit: contain;

  @media (max-width: 720px) {
    height: 15px;
    width: 15px;
  }
`

export const SideContent = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
  min-width: 0;

  @media (max-width: 720px) {
    display: grid;
    gap: 0;
    align-items: start;
  }
`

export const SideName = styled.span`
  color: #fff;
  font-weight: 700;
  letter-spacing: 0.2px;

  @media (max-width: 720px) {
    font-size: 11px;
    line-height: 1.2;
  }
`

export const SidePlayer = styled.span`
  opacity: 0.9;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  @media (max-width: 720px) {
    display: block;
    font-size: 10px;
    line-height: 1.2;
  }
`

export const SideFallback = styled.span`
  opacity: 0.6;
  font-style: italic;

  @media (max-width: 720px) {
    font-size: 10px;
  }

  @media (max-width: 420px) {
    display: none;
  }
`

export const CenterStack = styled.div`
  display: grid;
  justify-items: center;
  gap: 6px;

  @media (max-width: 720px) {
    grid-column: 1 / -1;
    order: -1;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    justify-self: center;
  }
`

export const VsBadge = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 800;
  letter-spacing: 0.5px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.06));

  @media (max-width: 720px) {
    width: 28px;
    height: 28px;
    font-size: 11px;
  }
`

export const BetPill = styled.div`
  padding: 4px 10px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  color: #fff;
  font-size: 12px;
  text-align: center;

  @media (max-width: 720px) {
    font-size: 11px;
    padding: 4px 8px;
  }
`

export const StatusRoot = styled.div`
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 200;
  text-align: right;

  @media (max-width: 720px) {
    top: 8px;
    right: 8px;
  }
`

export const StatusBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 12px;
  text-transform: uppercase;
  border: 1px solid #333;

  @media (max-width: 720px) {
    font-size: 10px;
    padding: 5px 8px;
  }
`

export const StatusDot = styled.span<{ $waiting: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: ${({ $waiting }) => ($waiting ? '#ffc107' : '#42ff78')};
`

export const StatusSubline = styled.div`
  margin-top: 6px;
  color: #fff;
  font-size: 12px;
  opacity: 0.9;
`

export const ControlsGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;

  @media (max-width: 720px) {
    justify-content: center;
  }
`

export const SideToggleGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;

  @media (max-width: 720px) {
    min-width: 190px;
  }
`

export const ControlButton = styled.button<{
  $variant?: 'primary' | 'secondary'
}>`
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 120ms ease, filter 120ms ease, background 120ms ease;

  ${({ $variant }) =>
    $variant === 'primary'
      ? css`
          background: #fff;
          color: #111;
        `
      : css`
          background: #222;
          color: #fff;
        `}

  &:hover:not(:disabled) {
    filter: brightness(1.06);
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none;
  }

  @media (max-width: 720px) {
    padding: 8px 12px;
    font-size: 13px;
  }
`

export const SideChoiceButton = styled.button<{
  $active: boolean
}>`
  border: none;
  border-radius: 8px;
  padding: 8px 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background 120ms ease, color 120ms ease;
  background: ${({ $active }) => ($active ? '#fff' : '#333')};
  color: ${({ $active }) => ($active ? '#111' : '#fff')};

  &:hover:not(:disabled) {
    filter: brightness(1.06);
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  @media (max-width: 720px) {
    flex: 1 1 0;
    min-width: 0;
    padding: 8px 10px;
    font-size: 13px;
  }
`
