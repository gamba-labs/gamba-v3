import styled, { css } from 'styled-components'

export const ModalContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-height: calc(90vh - 60px);
  overflow-y: auto;
  padding-right: 4px;
`

export const HeaderSection = styled.div`
  text-align: center;
`

export const Title = styled.h2`
  margin: 0;
  font-size: 24px;
`

export const Subtitle = styled.p`
  margin: 6px 0 0;
  color: #a2a2b2;
  font-size: 13px;
`

export const TabRow = styled.div`
  display: flex;
  gap: 6px;
  padding: 4px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
`

export const TabButton = styled.button<{ $selected: boolean }>`
  all: unset;
  box-sizing: border-box;
  cursor: pointer;
  flex: 1;
  text-align: center;
  padding: 10px 12px;
  border-radius: 8px;
  color: #a2a2b2;
  transition: background 0.2s ease, color 0.2s ease;

  ${(props) =>
    props.$selected &&
    css`
      background: rgba(255, 255, 255, 0.12);
      color: #fff;
      font-weight: 600;
    `}

  &:hover:not(:disabled) {
    color: #fff;
  }

  &:disabled {
    opacity: 0.6;
    cursor: default;
  }
`

export const LeaderboardList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

export const ListHeader = styled.div`
  display: grid;
  grid-template-columns: 52px 1fr 120px;
  gap: 8px;
  padding: 0 8px;
  color: #a2a2b2;
  font-size: 12px;
  text-transform: uppercase;
`

export const HeaderRank = styled.div`
  text-align: center;
`

export const HeaderPlayer = styled.div`
  text-align: left;
`

export const HeaderVolume = styled.div`
  text-align: right;
`

export const RankItem = styled.div<{ $isTop3?: boolean }>`
  display: grid;
  grid-template-columns: 52px 1fr 120px;
  gap: 8px;
  align-items: center;
  padding: 10px 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);

  ${(props) =>
    props.$isTop3 &&
    css`
      border-color: rgba(255, 228, 45, 0.28);
      background: rgba(255, 228, 45, 0.06);
    `}
`

export const RankNumber = styled.div<{ rank: number }>`
  text-align: center;
  font-weight: 600;
  color: #fff;

  ${(props) =>
    props.rank === 1 &&
    css`
      color: #ffd700;
    `}
  ${(props) =>
    props.rank === 2 &&
    css`
      color: #c0c0c0;
    `}
  ${(props) =>
    props.rank === 3 &&
    css`
      color: #cd7f32;
    `}
`

export const PlayerInfo = styled.div`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

export const VolumeAmount = styled.div`
  text-align: right;
  color: #03ffa4;
  font-variant-numeric: tabular-nums;
`

export const LoadingText = styled.p`
  margin: 0;
  text-align: center;
  color: #c2c2cf;
  padding: 20px 0;
`

export const ErrorText = styled.p`
  margin: 0;
  text-align: center;
  color: #ff8080;
  padding: 20px 0;
`

export const EmptyStateText = styled.p`
  margin: 0;
  text-align: center;
  color: #a2a2b2;
  padding: 20px 0;
`

export function formatVolume(value: number): string {
  if (!Number.isFinite(value)) return '$0.00'
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
