import styled, { keyframes } from 'styled-components'

const jackpotGradient = keyframes`
  0% { background: #6666ff; }
  15% { background: #0099ff; }
  30% { background: #00ff55; }
  45% { background: #ffe44d; }
  60% { background: #ff5c4d; }
  75% { background: #ff3399; }
  90% { background: #6666ff; }
  100% { background: #6666ff; }
`

const skeletonAnimation = keyframes`
  0%, 100% { background-color: #cccccc11; }
  50% { background-color: #cccccc22; }
`

export const Container = styled.section`
  width: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
`

export const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 420px;
  overflow-y: auto;
  -ms-overflow-style: none;  /* IE/Edge legacy */
  scrollbar-width: none;     /* Firefox */

  &::-webkit-scrollbar {
    width: 0;
    height: 0;
    display: none; /* Chrome/Brave/Safari/Edge */
    background: transparent;
  }
`

export const Recent = styled.button`
  all: unset;
  box-sizing: border-box;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5em;
  text-wrap: nowrap;
  padding: 10px;
  color: inherit;
  text-decoration: none;
  justify-content: space-between;
  border-radius: 10px;
  background: #0f121b;

  &:hover {
    background: #131724;
  }
`

export const RecentMain = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5em;
  min-width: 0;
`

export const GameImage = styled.img`
  height: 1.5em;
  width: 1.5em;
  object-fit: contain;
`

export const UserAddress = styled.div`
  color: var(--gamba-ui-primary-color);
  font-size: 14px;
`

export const Action = styled.div`
  opacity: 0.8;

  @media (max-width: 760px) {
    display: none;
  }
`

export const Profit = styled.div<{ $win: boolean }>`
  display: flex;
  gap: 0.5em;
  align-items: center;
  background: ${(props) => (props.$win ? '#00ff4021' : '#ffffff11')};
  border-radius: 10px;
  padding: 2px 6px;
  font-size: 14px;
`

export const TokenIcon = styled.img`
  height: 20px;
  width: 20px;
  border-radius: 50%;
  object-fit: cover;
`

export const TokenFallback = styled.span`
  height: 20px;
  width: 20px;
  border-radius: 50%;
  display: inline-grid;
  place-items: center;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  background: #373952;
`

export const Multiplier = styled.div`
  opacity: 0.75;
  font-size: 12px;

  @media (max-width: 760px) {
    display: none;
  }
`

export const Jackpot = styled.div`
  animation: ${jackpotGradient} 1s linear 0s infinite;
  display: flex;
  gap: 0.5em;
  align-items: center;
  color: #000;
  border-radius: 10px;
  padding: 1px 5px;

  @media (max-width: 760px) {
    display: none;
  }
`

export const Time = styled.div`
  opacity: 0.7;
  font-size: 12px;
  white-space: nowrap;
`

export const Skeleton = styled.div`
  height: 40px;
  width: 100%;
  border-radius: 10px;
  animation: ${skeletonAnimation} 1s infinite;
`

export const Panel = styled.div`
  padding: 10px;
  border-radius: 10px;
  background: #0f121b;
  font-size: 13px;
  opacity: 0.8;
`
