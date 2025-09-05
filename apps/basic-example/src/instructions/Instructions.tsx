import React from 'react'
import { PlayGameDemo } from '../PlayGameDemo'
import { JoinGameDemo } from '../JoinGameDemo'
import { CreateGameDemo } from '../CreateGameDemo'

type TabKey = 'singleplayer' | 'multiplayer' | 'referral'

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={active ? 'tab active' : 'tab'}
      style={{
        padding: '10px 12px',
        background: active ? '#fff' : '#fafafa',
        fontWeight: active ? 600 : 500,
        width: '100%',
        border: '1px solid #ddd',
        borderBottom: active ? 'none' : '1px solid #ddd',
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
        margin: 0,
      }}
    >
      {children}
    </button>
  )
}

export function InstructionCard({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = React.useState(defaultOpen)
  return (
    <div className="panel" style={{ padding: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ margin: 0 }}>{title}</h4>
        <button onClick={() => setOpen((v) => !v)} style={{ padding: '4px 8px' }}>{open ? 'Hide' : 'Show'}</button>
      </div>
      {open && (
        <div style={{ marginTop: 8 }}>
          {children}
        </div>
      )}
    </div>
  )
}

export function Instructions() {
  const [tab, setTab] = React.useState<TabKey>('singleplayer')

  return (
    <div className="panel">
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 0,
        margin: '-16px -16px 8px -16px',
        borderBottom: '1px solid #ddd',
      }}>
        <div style={{ borderRight: '1px solid #ddd' }}>
          <TabButton active={tab === 'singleplayer'} onClick={() => setTab('singleplayer')}>Singleplayer</TabButton>
        </div>
        <div style={{ borderRight: '1px solid #ddd' }}>
          <TabButton active={tab === 'multiplayer'} onClick={() => setTab('multiplayer')}>Multiplayer</TabButton>
        </div>
        <div>
          <TabButton active={tab === 'referral'} onClick={() => setTab('referral')}>Referral</TabButton>
        </div>
      </div>

      {tab === 'singleplayer' && (
        <div style={{ display: 'grid', gap: 12 }}>
          <PlayGameDemo />
        </div>
      )}

      {tab === 'multiplayer' && (
        <div style={{ display: 'grid', gap: 12 }}>
          <CreateGameDemo />
          <JoinGameDemo />
        </div>
      )}

      {tab === 'referral' && (
        <div className="muted">Referral instructions coming soon…</div>
      )}
    </div>
  )
}


