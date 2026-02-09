import styled, { css, keyframes } from 'styled-components'

const dealIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
`

const pulse = keyframes`
  0% { opacity: 0.74; }
  50% { opacity: 1; }
  100% { opacity: 0.74; }
`

export const Container = styled.div<{ $disabled?: boolean }>`
  user-select: none;
  transition: opacity 0.2s ease;
  ${({ $disabled }) => $disabled && css`
    pointer-events: none;
    opacity: 0.9;
  `}
`

export const Board = styled.div`
  width: min(100%, 720px);
  margin: 0 auto;
  border-radius: 16px;
  position: relative;
  overflow: hidden;
  font-family: "Trebuchet MS", "Avenir Next", "Segoe UI", sans-serif;
  background:
    radial-gradient(145% 120% at 50% -8%, #8ef7b455 0%, transparent 56%),
    radial-gradient(160% 120% at 50% 108%, #0f3322 20%, transparent 65%),
    linear-gradient(145deg, #1e8a55 0%, #14673f 50%, #0e422b 100%);
  box-shadow:
    0 16px 34px #00000052,
    inset 0 1px 0 #ffffff2b;
  padding: 14px;
  color: #f1fff5;
  display: grid;
  gap: 12px;

  @media (max-width: 640px) {
    padding: 10px;
    border-radius: 12px;
    gap: 10px;
  }
`

export const StatusRow = styled.div`
  display: grid;
  gap: 8px;
`

export const StatusBadge = styled.div<{ $phase: 'idle' | 'dealing' | 'settled' }>`
  justify-self: start;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border-radius: 999px;
  padding: 6px 10px;
  background: #0d3322;
  color: #d8ffe5;

  ${({ $phase }) => $phase === 'dealing' && css`
    animation: ${pulse} 1s ease infinite;
  `}
`

export const MetaRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
`

export const MetaValue = styled.div`
  font-size: 13px;
  font-weight: 700;
  padding: 5px 9px;
  border-radius: 999px;
  color: #fff7d0;
  background: #0d3a26;
`

export const HandsGrid = styled.div`
  display: grid;
  gap: 10px;
  min-width: 0;
`

export const StyledHandPanel = styled.section`
  min-width: 0;
  border-radius: 12px;
  background: #0a3725c7;
  padding: 10px;
  display: grid;
  gap: 8px;
`

export const HandHeader = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

export const HandTitle = styled.div`
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: #d0fce0;
`

export const HandScore = styled.div`
  font-size: 12px;
  font-weight: 700;
  padding: 4px 8px;
  border-radius: 999px;
  color: #fff8da;
  background: #0d3c28;
  min-width: 44px;
  text-align: center;
`

export const CardArea = styled.div<{ $empty?: boolean }>`
  min-width: 0;
  width: 100%;
  min-height: 118px;
  overflow-x: auto;
  overflow-y: hidden;
  display: flex;
  align-items: center;
  padding-bottom: 2px;

  ${({ $empty }) => $empty && css`
    justify-content: center;
  `}

  @media (max-width: 560px) {
    min-height: 108px;
  }
`

export const CardsTrack = styled.div`
  width: max-content;
  min-width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
`

export const EmptyCards = styled.div`
  display: flex;
  align-items: center;
  gap: 9px;
  opacity: 0.35;

  & > div {
    width: 78px;
    height: 110px;
    border-radius: 8px;
    border: 1px dashed #e5f8bf66;
    background: #0f4a3066;
    position: relative;
  }

  & > div::after {
    content: 'A';
    position: absolute;
    right: 8px;
    bottom: 6px;
    font-size: 20px;
    font-weight: 800;
    color: #f2f8cc;
  }

  @media (max-width: 560px) {
    & > div {
      width: 70px;
      height: 100px;
    }
  }
`

export const CardContainer = styled.div<{ $index: number }>`
  flex: 0 0 auto;
  animation: ${dealIn} 0.22s ease;
`

export const Card = styled.div<{ $color: string; $hidden?: boolean }>`
  width: 78px;
  height: 110px;
  border-radius: 8px;
  border: 1px solid ${({ $hidden }) => ($hidden ? '#b6c9ff66' : '#1b1b1b3a')};
  box-shadow: 0 6px 16px #00000049;
  background: ${({ $hidden }) => ($hidden
    ? 'linear-gradient(145deg, #244492 0%, #1b326f 100%)'
    : 'linear-gradient(165deg, #fffcf2 0%, #f1f2f5 100%)')};
  color: ${({ $hidden, $color }) => ($hidden ? '#d8e4ff' : $color)};
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 7px 8px;
  position: relative;

  ${({ $hidden }) => $hidden && css`
    background: linear-gradient(145deg, #2f4f9f 0%, #234084 100%);
  `}

  .rank {
    font-size: 20px;
    font-weight: 800;
    line-height: 1;
  }

  .suit {
    font-size: 34px;
    line-height: 1;
    align-self: flex-end;
  }

  @media (max-width: 560px) {
    width: 70px;
    height: 100px;

    .rank {
      font-size: 18px;
    }
    .suit {
      font-size: 30px;
    }
  }
`

export const OutcomeBanner = styled.div<{ $outcome: 'blackjack' | 'win' | 'lose'; $hidden?: boolean }>`
  border-radius: 10px;
  padding: 9px 10px;
  font-size: 13px;
  font-weight: 700;
  min-height: 40px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  background: #11492f;

  & > span:first-child {
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  & > span:last-child {
    white-space: nowrap;
  }

  ${({ $outcome }) => $outcome === 'blackjack' && css`
    background: #5d3d98;
    color: #f5ebff;
  `}
  ${({ $outcome }) => $outcome === 'win' && css`
    background: #116d3e;
    color: #e7ffe9;
  `}
  ${({ $outcome }) => $outcome === 'lose' && css`
    background: #793434;
    color: #ffe8e8;
  `}

  ${({ $hidden }) => $hidden && css`
    visibility: hidden;
    opacity: 0;
  `}
`
