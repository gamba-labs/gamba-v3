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
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>Live Multiplayer Games</h3>
        <button onClick={load} disabled={loading} style={{ padding: '4px 8px' }}>{loading ? 'Loading…' : 'Reload'}</button>
      </div>
      <div style={{ height: 360, overflowY: 'auto' }}>
        {error && <div className="panel" style={{ color: 'crimson', marginTop: 12 }}>Error: {error}</div>}
        {!error && (!games || games.length === 0) && (
          <div className="panel" style={{ marginTop: 8, padding: 8, fontSize: 13 }}>No games found.</div>
        )}
        {games && games.length > 0 && (
          <div style={{ display: 'grid', gap: 8 }}>
            {games.map((g) => (
              <div key={g.address} className="panel" style={{ display: 'grid', gap: 6, padding: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <code style={{ fontSize: 12 }}>{g.address}</code>
                  <span className="muted" style={{ fontSize: 12 }}>created {new Date(Number(g.data.creationTimestamp) * 1000).toLocaleString()}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 6, fontSize: 13 }}>
                  <div>
                    <div className="muted">Game ID</div>
                    <div>{g.data.gameId.toString()}</div>
                  </div>
                  <div>
                    <div className="muted">State</div>
                    <div>{String(g.data.state)}</div>
                  </div>
                  <div>
                    <div className="muted">Mint</div>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}><code style={{ fontSize: 12 }}>{String(g.data.mint)}</code></div>
                  </div>
                  <div>
                    <div className="muted">Max Players</div>
                    <div>{g.data.maxPlayers}</div>
                  </div>
                  <div>
                    <div className="muted">Teams</div>
                    <div>{g.data.numTeams}</div>
                  </div>
                  <div>
                    <div className="muted">Players</div>
                    <div>{g.data.players.length}</div>
                  </div>
                  <div>
                    <div className="muted">Min Bet</div>
                    <div>{g.data.minBet.toString()}</div>
                  </div>
                  <div>
                    <div className="muted">Max Bet</div>
                    <div>{g.data.maxBet.toString()}</div>
                  </div>
                  <div>
                    <div className="muted">Wager</div>
                    <div>{g.data.wager.toString()}</div>
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