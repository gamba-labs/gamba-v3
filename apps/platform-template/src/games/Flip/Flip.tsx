import React from 'react'
import { useGambaPlay } from '../../hooks/useGambaPlay'
import { useToken } from '../../providers/TokenContext'
import { TOKENS } from '../../config/constants'

export default function Flip({ meta, metadata }: { meta?: { name: string }; metadata?: string }) {
  const { play } = useGambaPlay()
  const { selected } = useToken()
  const tokenCfg = React.useMemo(() => TOKENS.find((t) => t.id === selected.id), [selected])
  const decimals = tokenCfg?.decimals ?? 0
  const ticker = tokenCfg?.ticker ?? ''

  const toLamports = React.useCallback((units: number) => Math.round(units * Math.pow(10, decimals)), [decimals])
  const formatUnits = React.useCallback((lamports: number | bigint) => {
    const num = Number(lamports) / Math.pow(10, decimals)
    return num.toFixed(Math.min(4, decimals))
  }, [decimals])

  const UNIT_OPTIONS = React.useMemo<number[]>(() => (
    decimals >= 8 ? [0.01, 0.1, 0.5, 1] : [1, 5, 10, 50, 100]
  ), [decimals])

  const WAGER_OPTIONS = React.useMemo(() => UNIT_OPTIONS.map(toLamports), [UNIT_OPTIONS, toLamports])
  const [wager, setWager] = React.useState<number>(WAGER_OPTIONS[0])
  const [loading, setLoading] = React.useState(false)
  const [result, setResult] = React.useState<string | null>(null)

  const onPlay = async () => {
    try {
      setLoading(true)
      setResult(null)
      // 2x or 0x: [2,0]
      const res = await play([2, 0], { wager, metadata: metadata ?? JSON.stringify({ game: meta?.name ?? 'flip' }) })
      if ('signature' in res) setResult(res.signature)
      else setResult(String(res.error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'grid', gap: 12, placeItems: 'center', height: '100%' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ opacity: .8, fontSize: 12 }}>Wager ({ticker})</span>
        {WAGER_OPTIONS.map((opt, i) => (
          <button key={opt} onClick={() => setWager(opt)} disabled={loading} aria-pressed={wager === opt}>{UNIT_OPTIONS[i]} {ticker}</button>
        ))}
      </div>
      <div>Selected: {formatUnits(wager)} {ticker} · Bet [2, 0]</div>
      <button onClick={onPlay} disabled={loading}>{loading ? 'Playing…' : 'Play 2x or 0x'}</button>
      {result && (
        <div style={{ fontSize: 12, opacity: 0.8 }}>Tx: {result}</div>
      )}
    </div>
  )
}


