import React from 'react'
import bs58 from 'bs58'
import { multiplayer } from '@gamba/sdk'
import { type Base58EncodedBytes } from '@solana/kit'
import { useRpc } from './rpc/RpcContext'

type GameAccount = { address: string; data: ReturnType<typeof multiplayer.getGameDecoder> extends infer D ? D extends { decode: (u8: Uint8Array) => infer T } ? T : never : never }

export function GamesList() {
  const { rpc } = useRpc()
  const [games, setGames] = React.useState<GameAccount[] | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const base64ToBytes = (b64: string) => {
    const bin = atob(b64)
    const out = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
    return out
  }

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const disc = multiplayer.getGameDiscriminatorBytes()
      const discB58 = bs58.encode(new Uint8Array(disc))
      const res = await rpc
        .getProgramAccounts(multiplayer.MULTIPLAYER_PROGRAM_ADDRESS, {
          filters: [
            { memcmp: { offset: 0n, bytes: discB58 as unknown as Base58EncodedBytes, encoding: 'base58' } },
          ],
          encoding: 'base64',
        })
        .send()
      const decoded: GameAccount[] = res.map((item: any) => {
        const [b64] = item.account.data as [string, string]
        const bytes = base64ToBytes(b64)
        const data = multiplayer.getGameDecoder().decode(bytes)
        return { address: String(item.pubkey), data }
      })
      setGames(decoded)
    } catch (e: any) {
      setError(e?.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }, [rpc])

  React.useEffect(() => { load() }, [load])

  return (
    <div className="games-list">
      <div className="games-header">
        <h3>Live Multiplayer Games</h3>
        <button onClick={load} disabled={loading} className="btn-small">{loading ? 'Loading…' : 'Reload'}</button>
      </div>
      <div className="games-content">
        {error && <div className="panel games-error">Error: {error}</div>}
        {!error && (!games || games.length === 0) && (
          <div className="panel games-empty">No games found.</div>
        )}
        {games && games.length > 0 && (
          <div className="games-grid">
            {games.map((g) => (
              <div key={g.address} className="panel game-item">
                <div className="game-item-header">
                  <code className="game-item-address">{g.address}</code>
                  <span className="muted game-item-timestamp">created {new Date(Number(g.data.creationTimestamp) * 1000).toLocaleString()}</span>
                </div>
                <div className="game-info-grid">
                  <div className="game-info-item">
                    <div className="muted game-info-label">Game ID</div>
                    <div className="game-info-value">{g.data.gameId.toString()}</div>
                  </div>
                  <div className="game-info-item">
                    <div className="muted game-info-label">State</div>
                    <div className="game-info-value">{String(g.data.state)}</div>
                  </div>
                  <div className="game-info-item">
                    <div className="muted game-info-label">Mint</div>
                    <div className="game-info-value" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}><code className="game-info-code">{String(g.data.mint)}</code></div>
                  </div>
                  <div className="game-info-item">
                    <div className="muted game-info-label">Max Players</div>
                    <div className="game-info-value">{g.data.maxPlayers}</div>
                  </div>
                  <div className="game-info-item">
                    <div className="muted game-info-label">Teams</div>
                    <div className="game-info-value">{g.data.numTeams}</div>
                  </div>
                  <div className="game-info-item">
                    <div className="muted game-info-label">Players</div>
                    <div className="game-info-value">{g.data.players.length}</div>
                  </div>
                  <div className="game-info-item">
                    <div className="muted game-info-label">Min Bet</div>
                    <div className="game-info-value">{g.data.minBet.toString()}</div>
                  </div>
                  <div className="game-info-item">
                    <div className="muted game-info-label">Max Bet</div>
                    <div className="game-info-value">{g.data.maxBet.toString()}</div>
                  </div>
                  <div className="game-info-item">
                    <div className="muted game-info-label">Wager</div>
                    <div className="game-info-value">{g.data.wager.toString()}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
