import styled from 'styled-components'

export const Container = styled.section`
  border: 1px solid rgba(125,125,140,0.25);
  border-radius: 12px;
  background: #0c0c11;
  overflow: hidden;
`

export const TitleBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(125,125,140,0.2);
`

export const Title = styled.h3`
  margin: 0;
  font-size: 14px;
`

export const ScopeBadge = styled.span`
  margin-left: auto;
  font-size: 11px;
  opacity: 0.8;
  background: #ffffff14;
  padding: 4px 8px;
  border-radius: 999px;
`

export const List = styled.div`
  max-height: 360px;
  overflow-y: auto;
`

export const Row = styled.div<{ $win?: boolean }>`
  display: grid;
  grid-template-columns: 1fr 120px 140px 80px;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(125,125,140,0.12);
  align-items: center;
  &:last-child { border-bottom: none; }
  background: ${(p) => (p.$win ? 'linear-gradient(90deg, #0f1a12, transparent)' : 'transparent')};
`

export const Cell = styled.div`
  min-width: 0;
  font-size: 13px;
  opacity: 0.95;
  & > code { font-size: 12px; }
  &[data-right] { text-align: right; }
`

export const Amount = styled.span`
  font-weight: 600;
`

export const PayoutTag = styled.span<{ $win?: boolean }>`
  font-size: 12px;
  border-radius: 999px;
  padding: 3px 8px;
  justify-self: end;
  color: ${(p) => (p.$win ? '#2cff91' : '#ff6b6b')};
  background: ${(p) => (p.$win ? '#2cff9114' : '#ff6b6b14')};
`


