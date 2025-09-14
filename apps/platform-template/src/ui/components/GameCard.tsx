import React from 'react'
import type { GameBundle } from '../../games'
import { GameMeta as MetaBox, GameThumb as ThumbBox, GameCard as CardBox } from '../sections/Home/Home.styles'

export function GameCard({ game, onClick }: { game: GameBundle; onClick: () => void }) {
  return (
    <CardBox onClick={onClick} aria-label={`Open ${game.meta.name}`}>
      <ThumbBox style={{ background: game.meta.background }}>
        <img
          src={game.meta.image}
          alt={game.meta.name}
          style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 10 }}
        />
      </ThumbBox>
      <MetaBox>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <div style={{ fontWeight: 700 }}>{game.meta.name}</div>
          {game.meta.tag && (
            <span style={{ fontSize: 11, opacity: 0.9, background: '#ffffff14', padding: '3px 6px', borderRadius: 999 }}>{game.meta.tag}</span>
          )}
        </div>
        <div style={{ opacity: 0.8, fontSize: 14 }}>{game.meta.description}</div>
      </MetaBox>
    </CardBox>
  )
}


