import React from 'react'
import styled from 'styled-components'
import { useToken } from '../../providers/TokenContext'

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

  return (
    <div style={{ position: 'relative' }}>
      <Btn onClick={() => setOpen((v) => !v)} aria-haspopup="listbox" aria-expanded={open}>
        {selected.symbol} {selected.label}
      </Btn>
      {open && (
        <div style={{ position: 'absolute', left: 0, marginTop: 6, background: 'var(--bg)', color: 'var(--fg)', border: '1px solid rgba(125,125,140,0.35)', borderRadius: 8, minWidth: 160 }}>
          {tokens.map((t) => (
            <button
              key={t.id}
              style={{ width: '100%', padding: '8px 10px', background: 'transparent', color: 'inherit', border: 'none', textAlign: 'left', cursor: 'pointer' }}
              onClick={() => { setSelected(t); setOpen(false) }}
            >
              {t.symbol} {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}


