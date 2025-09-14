import React from 'react'
import bs58 from 'bs58'
import { core, pdas } from '@gamba/sdk'
import { useRpc } from '../../../providers/RpcContext'
import type { Address } from '@solana/kit'
import { TOKENS, DEFAULT_POOL_AUTHORITY, RECENT_PLAYS_SCOPE } from '../../../config/constants'
import { Container, TitleBar, Title, ScopeBadge, List, Row, Cell, Amount, PayoutTag } from './RecentPlays.styles'
import { createSolanaRpcSubscriptions, address as toAddress } from '@solana/kit'

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

export function RecentPlays({ limit = 15 }: { limit?: number }) {
  const { rpc } = useRpc()
  const [events, setEvents] = React.useState<Array<{ e: Settled; sig: string; time?: number }>>([])
  const [loading, setLoading] = React.useState(false)
  const [err, setErr] = React.useState<string | null>(null)
  const scope = RECENT_PLAYS_SCOPE

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

  const getPlatformPools = React.useCallback(async (): Promise<Set<string>> => {
    const out = new Set<string>()
    for (const t of TOKENS) {
      try {
        const authority = (t.poolAuthority ?? DEFAULT_POOL_AUTHORITY) as Address
        const p = await pdas.derivePoolPda(t.mint as Address, authority)
        out.add(String(p))
      } catch {}
    }
    return out
  }, [])

  const load = React.useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const sigResp = await rpc.getSignaturesForAddress(core.GAMBA_PROGRAM_ADDRESS, { limit: 40 }).send()
      const out: Array<{ e: Settled; sig: string; time?: number }> = []
      const slotTimeCache = new Map<number, number>()
      const getTimeFromSlot = async (slot?: number): Promise<number | undefined> => {
        const s = asNumber(slot as any)
        if (typeof s !== 'number') return undefined
        if (slotTimeCache.has(s)) return slotTimeCache.get(s)
        try {
          const t = await (rpc as any).getBlockTime(s).send()
          if (typeof t === 'number') {
            slotTimeCache.set(s, t)
            return t
          }
          // Fallback: fetch full block and read blockTime
          try {
            const blk = await (rpc as any).getBlock(s, { maxSupportedTransactionVersion: 0 }).send()
            const bt = typeof blk?.blockTime === 'number' ? blk.blockTime : undefined
            if (typeof bt === 'number') slotTimeCache.set(s, bt)
            return bt
          } catch {
            return undefined
          }
        } catch {
          return undefined
        }
      }
      for (const s of sigResp) {
        if (out.length >= limit) break
        const tx = await rpc.getTransaction(s.signature, { encoding: 'json', maxSupportedTransactionVersion: 0, commitment: 'confirmed' }).send()
        
        const logs = (tx?.meta?.logMessages ?? undefined) as readonly string[] | null | undefined
        const decoded = tryDecodeFromLogs(logs)
        let timeResolved: number | undefined = asNumber((tx as any)?.blockTime)
        if (typeof timeResolved !== 'number') {
          const sbt = asNumber((s as any)?.blockTime)
          const slotVal = asNumber((tx as any)?.slot) ?? asNumber((s as any)?.slot)
          timeResolved = typeof sbt === 'number' ? sbt : await getTimeFromSlot(slotVal as any)
        }
        if (decoded) out.push({ e: decoded, sig: s.signature, time: timeResolved })

        const inner = (tx?.meta as any)?.innerInstructions as Array<{ instructions: Array<{ data?: string }> }> | undefined
        if (inner) {
          for (const group of inner) {
            for (const ix of group.instructions ?? []) {
              if (typeof ix.data === 'string' && ix.data.length > 0) {
                try {
                  const raw = bs58.decode(ix.data)
                  const ev = tryDecodeGameSettledBytes(raw)
                  if (ev) out.push({ e: ev, sig: s.signature, time: timeResolved })
                } catch {}
              }
            }
          }
        }
      }

      let filtered = out
      if (scope === 'platform') {
        const pools = await getPlatformPools()
        filtered = out.filter((x) => pools.has(String(x.e.pool)))
      }

      filtered.sort((a, b) => (b.time ?? 0) - (a.time ?? 0))
      setEvents(filtered.slice(0, limit))
    } catch (e: any) {
      setErr(e?.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }, [rpc, scope, limit, getPlatformPools])

  React.useEffect(() => { load() }, [load])

  // Optional: real-time via logs subscription can be added here. For now we avoid polling.

  const shorten = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`
  const getDecimals = (mint: Address): number => TOKENS.find((t) => String(t.mint) === String(mint))?.decimals ?? 0
  const getTicker = (mint: Address): string => TOKENS.find((t) => String(t.mint) === String(mint))?.ticker ?? ''
  const formatUnits = (amount: bigint | number, mint: Address) => {
    const n = typeof amount === 'bigint' ? Number(amount) : amount
    const d = getDecimals(mint)
    return (n / Math.pow(10, d)).toFixed(Math.min(4, d))
  }

  // Coerce numbers that may arrive as bigint from RPC (e.g., blockTime, slot)
  const asNumber = (v: unknown): number | undefined => {
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (typeof v === 'bigint') {
      const n = Number(v)
      return Number.isFinite(n) ? n : undefined
    }
    return undefined
  }

  // Friendly time-ago label like "3m ago" / "Just now"
  const timeAgo = (unixSeconds?: number): string => {
    if (!unixSeconds) return 'Just now'
    const diffMs = Date.now() - unixSeconds * 1000
    const sec = Math.floor(diffMs / 1000)
    const min = Math.floor(sec / 60)
    const hrs = Math.floor(min / 60)
    const days = Math.floor(hrs / 24)
    if (days >= 1) return `${days}d ago`
    if (hrs >= 1) return `${hrs}h ago`
    if (min >= 1) return `${min}m ago`
    return 'Just now'
  }

  // Re-render periodically so time-ago labels update without extra RPC calls
  React.useEffect(() => {
    const t = setInterval(() => {
      setTick((n) => n + 1)
    }, 30000)
    return () => clearInterval(t)
  }, [])

  const [tick, setTick] = React.useState(0)

  // Live subscription (no polling): trigger on Gamba state account changes, then ingest recent txs
  const seenRef = React.useRef<Set<string>>(new Set())
  const poolsRef = React.useRef<Set<string>>(new Set())
  const slotTimeCacheRef = React.useRef<Map<number, number>>(new Map())

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (scope === 'platform') {
        const pools = await getPlatformPools()
        if (!cancelled) poolsRef.current = pools
      } else {
        poolsRef.current = new Set()
      }
    })()
    return () => { cancelled = true }
  }, [scope, getPlatformPools])

  React.useEffect(() => {
    const toWs = (url: string) => url.replace(/^http/i, 'ws')
    const wsUrl = toWs((import.meta as any).env?.RPC_URL || 'https://api.mainnet-beta.solana.com')
    const rpcSubs = createSolanaRpcSubscriptions(wsUrl)
    const abortController = new AbortController()
    let closed = false

    const getTimeFromSlot = async (slotVal: number | bigint | undefined): Promise<number | undefined> => {
      const s = typeof slotVal === 'bigint' ? Number(slotVal) : (typeof slotVal === 'number' ? slotVal : undefined)
      if (typeof s !== 'number') return undefined
      const cache = slotTimeCacheRef.current
      if (cache.has(s)) return cache.get(s)
      try {
        const t = await (rpc as any).getBlockTime(s).send()
        if (typeof t === 'number') { cache.set(s, t); return t }
        const blk = await (rpc as any).getBlock(s, { maxSupportedTransactionVersion: 0 }).send()
        const bt = typeof blk?.blockTime === 'number' ? blk.blockTime : undefined
        if (typeof bt === 'number') cache.set(s, bt)
        return bt
      } catch { return undefined }
    }

    const ingestLatest = async () => {
      try {
        const sigResp = await rpc.getSignaturesForAddress(core.GAMBA_PROGRAM_ADDRESS, { limit: 20 }).send()
        for (const s of sigResp) {
          const signature = s.signature
          if (seenRef.current.has(signature)) continue
          const tx = await rpc.getTransaction(signature, { encoding: 'json', maxSupportedTransactionVersion: 0, commitment: 'confirmed' }).send()
          const logs = (tx?.meta?.logMessages ?? undefined) as readonly string[] | null | undefined
          const decoded = tryDecodeFromLogs(logs)
          if (!decoded) continue
          if (scope === 'platform' && !poolsRef.current.has(String((decoded as any).pool))) continue
          seenRef.current.add(signature)
          const slot = (tx as any)?.slot ?? (s as any)?.slot
          let timeResolved: number | undefined = typeof (tx as any)?.blockTime === 'number' ? (tx as any)?.blockTime : undefined
          if (typeof timeResolved !== 'number') {
            const sbt = (s as any)?.blockTime as number | bigint | undefined
            timeResolved = typeof sbt === 'number' ? sbt : await getTimeFromSlot(slot as any)
          }
          setEvents((prev) => [{ e: decoded, sig: signature, time: timeResolved }, ...prev].slice(0, limit))
        }
      } catch {}
    }

    ;(async () => {
      try {
        const gambaState = await pdas.deriveGambaStatePda()
        const notifications = await rpcSubs.accountNotifications(toAddress(String(gambaState)), { commitment: 'confirmed' }).subscribe({ abortSignal: abortController.signal })
        // Initial ingest
        await ingestLatest()
        for await (const n of notifications) {
          if (closed) break
          // On any state change, ingest newest signatures
          await ingestLatest()
        }
      } catch {
        // ignore
      }
    })()

    return () => {
      closed = true
      abortController.abort()
    }
  }, [rpc, scope, limit])

  return (
    <Container>
      <TitleBar>
        <Title>Recent Plays</Title>
        <ScopeBadge>{scope === 'platform' ? 'This Platform' : 'Global'}</ScopeBadge>
      </TitleBar>
      <List>
        {err && <div className="panel" style={{ color: 'crimson', marginTop: 8, padding: 8, fontSize: 13 }}>Error: {err}</div>}
        {!err && events.length === 0 && (
          <div className="panel" style={{ marginTop: 8, padding: 8, fontSize: 13 }}>No recent plays.</div>
        )}
        {events.map(({ e, sig, time }) => {
          const win = BigInt(e.payout) > 0n
          return (
            <Row key={sig} $win={win}>
              <Cell>
                <div style={{ display: 'flex', gap: 8 }}>
                  <code>{shorten(String(e.user))}</code>
                </div>
              </Cell>
              <Cell data-right>
                <Amount>{formatUnits(e.wager as any, e.tokenMint as Address)} {getTicker(e.tokenMint as Address)}</Amount>
              </Cell>
              <Cell data-right>
                <PayoutTag $win={win}>{win ? `+${formatUnits(e.payout as any, e.tokenMint as Address)} ${getTicker(e.tokenMint as Address)}` : '0'}</PayoutTag>
              </Cell>
              <Cell data-right>
                <div className="muted" style={{ fontSize: 12 }}>{timeAgo(time)}</div>
              </Cell>
            </Row>
          )
        })}
      </List>
    </Container>
  )
}


