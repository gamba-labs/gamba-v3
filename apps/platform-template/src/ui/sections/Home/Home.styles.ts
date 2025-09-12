import styled from 'styled-components'

export const Banner = styled.section`
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 16px;
  align-items: center;
  padding: 16px;
  border: 1px solid rgba(125,125,140,0.25);
  border-radius: 12px;
  background: linear-gradient(145deg, #121219, #0b0b0f);
  @media (max-width: 900px) { grid-template-columns: 1fr; }
`

export const BannerTitle = styled.h1`
  margin: 0;
  font-size: 32px;
`

export const BannerText = styled.p`
  margin: 8px 0 0 0;
  opacity: 0.85;
`

export const GamesGrid = styled.section`
  margin-top: 24px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
`

export const GameCard = styled.button`
  text-align: left;
  background: #0c0c11;
  border: 1px solid rgba(125,125,140,0.25);
  color: inherit;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  display: grid;
  grid-template-rows: 140px auto;
  &:hover { outline: 1px solid rgba(149,100,255,0.6) }
`

export const GameThumb = styled.div`
  background: radial-gradient(50% 50% at 50% 50%, #1a1b28 0%, #0c0c11 100%);
  display: grid;
  place-items: center;
  img { max-height: 100%; }
`

export const GameMeta = styled.div`
  padding: 12px;
  display: grid;
  gap: 6px;
`

export const RecentList = styled.section`
  margin-top: 32px;
  display: grid;
  gap: 10px;
`


