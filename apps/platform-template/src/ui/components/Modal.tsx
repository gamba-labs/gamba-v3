import React from 'react'
import styled from 'styled-components'

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: grid;
  place-items: center;
  z-index: 1100;
`

const Sheet = styled.div`
  width: min(92vw, 520px);
  background: var(--bg);
  color: var(--fg);
  border-radius: 12px;
  border: 1px solid rgba(125,125,140,0.25);
  box-shadow: 0 10px 32px rgba(0,0,0,0.35);
  padding: 16px;
`

export function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null
  return (
    <Backdrop onClick={onClose}>
      <Sheet onClick={(e) => e.stopPropagation()}>{children}</Sheet>
    </Backdrop>
  )
}


