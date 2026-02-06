import React from 'react'
import bs58 from 'bs58'
import { core } from '@gamba/core'
import { useRpc } from './useRpc'

type Settled = ReturnType<typeof core.getGameSettledDecoder> extends infer D
  ? D extends { decode: (u8: Uint8Array) => infer T }
    ? T
    : never
  : never

function base64ToBytes(b64: string) {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export function RecentGamesList() {
  const { rpc } = useRpc()
  const [events, setEvents] = React.useState<Array<{ e: Settled; sig: string; time?: number }>>([])
  const [loading, setLoading] = React.useState(false)
  const [err, setErr] = React.useState<string | null>(null)

  const tryDecodeGameSettledBytes = (bytes: Uint8Array): Settled | null => {
    const candidates = [bytes.subarray(8), bytes.subarray(16), bytes]
    for (const c of candidates) {
      try {
        return core.getGameSettledDecoder().decode(c) as Settled
      } catch {}
    }
    return null
  }

  const tryDecodeFromLogs = (logs?: readonly string[] | null): Settled | null => {
    if (!logs) return null
    for (const line of logs) {
      // Inline label
      const markerInline = 'Program log: GameSettled: '
      const idxInline = line.indexOf(markerInline)
      if (idxInline >= 0) {
        const b64 = line.slice(idxInline + markerInline.length).trim()
        try {
          const bytes = base64ToBytes(b64)
          const e = tryDecodeGameSettledBytes(bytes)
          if (e) return e as Settled
        } catch {}
      }
      // Generic program data
      const markerData = 'Program data: '
      const idxData = line.indexOf(markerData)
      if (idxData >= 0) {
        const b64 = line.slice(idxData + markerData.length).trim()
        try {
          const bytes = base64ToBytes(b64)
          const e = tryDecodeGameSettledBytes(bytes)
          if (e) return e as Settled
        } catch {}
      }
    }
    return null
  }

  const load = React.useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const sigResp = await rpc.getSignaturesForAddress(core.GAMBA_PROGRAM_ADDRESS, { limit: 20 }).send()
      const out: Array<{ e: Settled; sig: string; time?: number }> = []
      for (const s of sigResp) {
        if (out.length >= 15) break
        const tx = await rpc.getTransaction(s.signature, { encoding: 'json', maxSupportedTransactionVersion: 0, commitment: 'confirmed' }).send()
        const logs = (tx?.meta?.logMessages ?? undefined) as readonly string[] | null | undefined
        const decoded = tryDecodeFromLogs(logs)
        const time = typeof tx?.blockTime === 'number' ? tx.blockTime : undefined
        if (decoded) out.push({ e: decoded, sig: s.signature, time })

        // Also inspect inner instructions for emit_cpi! payloads
        const inner = (tx?.meta as any)?.innerInstructions as Array<{ instructions: Array<{ data?: string }> }> | undefined
        if (inner) {
          for (const group of inner) {
            for (const ix of group.instructions ?? []) {
              if (typeof ix.data === 'string' && ix.data.length > 0) {
                try {
                  const raw = bs58.decode(ix.data)
                  const ev = tryDecodeGameSettledBytes(raw)
                  if (ev) out.push({ e: ev, sig: s.signature, time })
                } catch {}
              }
            }
          }
        }
      }
      out.sort((a, b) => (b.time ?? 0) - (a.time ?? 0))
      setEvents(out.slice(0, 15))
    } catch (e: any) {
      setErr(e?.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }, [rpc])

  React.useEffect(() => { load() }, [load])

  return (
    <div className="games-list">
      <div className="games-header">
        <h3>Recent Games</h3>
        <button onClick={load} disabled={loading} className="btn-small">{loading ? 'Loading…' : 'Reload'}</button>
      </div>
      <div className="games-content">
        {err && <div className="panel games-error">Error: {err}</div>}
        {!err && events.length === 0 && (
          <div className="panel games-empty">No recent games.</div>
        )}
        {events.length > 0 && (
          <div className="games-grid">
            {events.map(({ e, sig, time }) => (
              <div key={sig} className="panel recent-game-item">
                <div className="recent-game-header">
                  <code className="recent-game-signature">{sig.slice(0, 12)}…</code>
                  <span className="muted recent-game-time">{time ? new Date(time * 1000).toLocaleString() : ''}</span>
                </div>
                <div className="recent-game-info-grid">
                  <div className="game-info-item">
                    <div className="muted game-info-label">User</div>
                    <div className="game-info-value" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}><code className="game-info-code">{String(e.user)}</code></div>
                  </div>
                  <div className="game-info-item">
                    <div className="muted game-info-label">Pool</div>
                    <div className="game-info-value" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}><code className="game-info-code">{String(e.pool)}</code></div>
                  </div>
                  <div className="game-info-item">
                    <div className="muted game-info-label">Token</div>
                    <div className="game-info-value" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}><code className="game-info-code">{String(e.tokenMint)}</code></div>
                  </div>
                  <div className="game-info-item">
                    <div className="muted game-info-label">Wager</div>
                    <div className="game-info-value">{e.wager.toString()}</div>
                  </div>
                  <div className="game-info-item">
                    <div className="muted game-info-label">Payout</div>
                    <div className="game-info-value">{e.payout.toString()}</div>
                  </div>
                  <div className="game-info-item">
                    <div className="muted game-info-label">Multiplier (bps)</div>
                    <div className="game-info-value">{e.multiplierBps}</div>
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


