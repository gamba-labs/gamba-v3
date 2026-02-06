import styled from 'styled-components'
import { FEATURED_GAME_ID, FEATURED_GAME_INLINE } from '../../../config/constants'
import { GAMES } from '../../../games'
import { GamePanel } from '../Game/Game'

const Wrapper = styled.div`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0;
  box-sizing: border-box;
`

export default function FeaturedInlineGame() {
  if (!FEATURED_GAME_INLINE) return null

  const featuredId = FEATURED_GAME_ID || GAMES[0]?.id || 'flip'
  const game = GAMES.find((entry) => entry.id === featuredId) ?? GAMES[0]

  if (!game) return null

  return (
    <Wrapper>
      <GamePanel id={game.id} inline />
    </Wrapper>
  )
}
