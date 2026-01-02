import React from 'react'
import styled from 'styled-components'
import { useToken } from '../../providers/TokenContext'
import { useRpc } from '../../providers/RpcContext'
import { useConnector } from '@solana/connector'
import { TOKENS } from '../../config/constants'
import { pdas } from '@gamba/sdk'
import type { Address } from '@solana/kit'

const Btn = styled.button`
  appearance: none;
  border: 1px solid rgba(125,125,140,0.35);
  background: transparent;
  color: inherit;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
`

export function TokenSelect() {
  const { tokens, selected, setSelected } = useToken()
  const [open, setOpen] = React.useState(false)
  const { rpc } = useRpc()
  const { account } = useConnector()
  const [balances, setBalances] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!account) { setBalances({}); return }
      try {
        const results = await Promise.all(tokens.map(async (t) => {
          const cfg = TOKENS.find((c) => c.id === t.id)
          if (!cfg) return [t.id, '0'] as const
          try {
            const isSol = t.id === 'sol' || String(cfg.mint) === 'So11111111111111111111111111111111111111112'
            const accountAddress = String((account as any).address ?? account) as Address
            if (isSol) {
              const res = await rpc.getBalance(accountAddress).send()
              const lamports = BigInt((res as any)?.value ?? res ?? 0)
              const ui = Number(lamports) / 1e9
              return [t.id, ui.toFixed(4)] as const
            } else {
              const ata = await pdas.deriveAta(accountAddress, cfg.mint as Address)
              const res = await rpc.getTokenAccountBalance(ata).send()
              const raw = (res?.value?.amount ?? '0') as string
              const uiStr = (res?.value?.uiAmountString as string | undefined)
              if (uiStr !== undefined) return [t.id, uiStr] as const
              const decimals = TOKENS.find((c) => c.id === t.id)?.decimals ?? 0
              const ui = Number(BigInt(raw)) / Math.pow(10, decimals)
              return [t.id, ui.toFixed(4)] as const
            }
          } catch {
            return [t.id, '0'] as const
          }
        }))
        if (!cancelled) setBalances(Object.fromEntries(results))
      } catch {
        if (!cancelled) setBalances({})
      }
    })()
    return () => { cancelled = true }
  }, [rpc, account, tokens])

  return (
    <div style={{ position: 'relative' }}>
      <Btn onClick={() => setOpen((v) => !v)} aria-haspopup="listbox" aria-expanded={open}>
        {selected.ticker} {balances[selected.id] ? `· ${balances[selected.id]}` : ''}
      </Btn>
      {open && (
        <div style={{ position: 'absolute', left: 0, marginTop: 6, background: 'var(--bg)', color: 'var(--fg)', border: '1px solid rgba(125,125,140,0.35)', borderRadius: 8, minWidth: 160 }}>
          {tokens.map((t) => (
            <button
              key={t.id}
              style={{ width: '100%', padding: '8px 10px', background: 'transparent', color: 'inherit', border: 'none', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
              onClick={() => { setSelected(t); setOpen(false) }}
            >
              <span>{t.ticker}</span>
              <span style={{ opacity: .8, fontSize: 12 }}>{balances[t.id] ?? '—'}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
