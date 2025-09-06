import React from 'react'
import { PlayGame } from './singleplayer/PlayGame'
import { PlayerInitialize } from './singleplayer/PlayerInitialize'
import { PlayerClose } from './singleplayer/PlayerClose'
import { DistributeFees } from './singleplayer/DistributeFees'
import { PoolInitialize } from './singleplayer/PoolInitialize'
import { PoolDeposit } from './singleplayer/PoolDeposit'
import { PoolWithdraw } from './singleplayer/PoolWithdraw'
import { PoolMintBonusTokens } from './singleplayer/PoolMintBonusTokens'
import { JoinGame } from './multiplayer/JoinGame'
import { CreateGame } from './multiplayer/CreateGame'
import { LeaveGame } from './multiplayer/LeaveGame'
import { SelectWinners } from './multiplayer/SelectWinners'
import { EditBet } from './multiplayer/EditBet'

type TabKey = 'singleplayer' | 'multiplayer' | 'referral'

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={active ? 'tab active' : 'tab'}>
      {children}
    </button>
  )
}

export function InstructionCard({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = React.useState(defaultOpen)
  return (
    <div className="panel panel-tight">
      <div className="card-header">
        <h4 style={{ margin: 0 }}>{title}</h4>
        <button onClick={() => setOpen((v) => !v)} className="btn-small">{open ? 'Hide' : 'Show'}</button>
      </div>
      {open && <div className="card-body">{children}</div>}
    </div>
  )
}

export function Instructions() {
  const [tab, setTab] = React.useState<TabKey>('singleplayer')

  return (
    <div className="panel">
      <div className="tabs">
        <div>
          <TabButton active={tab === 'singleplayer'} onClick={() => setTab('singleplayer')}>Singleplayer</TabButton>
        </div>
        <div>
          <TabButton active={tab === 'multiplayer'} onClick={() => setTab('multiplayer')}>Multiplayer</TabButton>
        </div>
        <div>
          <TabButton active={tab === 'referral'} onClick={() => setTab('referral')}>Referral</TabButton>
        </div>
      </div>

      {tab === 'singleplayer' && (
        <div style={{ display: 'grid', gap: 12 }}>
          <InstructionCard title="Play Game">
            <PlayGame />
          </InstructionCard>
          <InstructionCard title="Player Initialize">
            <PlayerInitialize />
          </InstructionCard>
          <InstructionCard title="Player Close">
            <PlayerClose />
          </InstructionCard>
          <InstructionCard title="Distribute Fees">
            <DistributeFees />
          </InstructionCard>
          <InstructionCard title="Pool Initialize">
            <PoolInitialize />
          </InstructionCard>
          <InstructionCard title="Pool Deposit">
            <PoolDeposit />
          </InstructionCard>
          <InstructionCard title="Pool Withdraw">
            <PoolWithdraw />
          </InstructionCard>
          <InstructionCard title="Pool Mint Bonus Tokens">
            <PoolMintBonusTokens />
          </InstructionCard>
        </div>
      )}

      {tab === 'multiplayer' && (
        <div style={{ display: 'grid', gap: 12 }}>
          <InstructionCard title="Create Game">
            <CreateGame />
          </InstructionCard>
          <InstructionCard title="Join Game">
            <JoinGame />
          </InstructionCard>
          <InstructionCard title="Leave Game">
            <LeaveGame />
          </InstructionCard>
          <InstructionCard title="Select Winners">
            <SelectWinners />
          </InstructionCard>
          <InstructionCard title="Edit Bet (leave+join)">
            <EditBet />
          </InstructionCard>
        </div>
      )}

      {tab === 'referral' && (
        <div className="muted">Referral instructions coming soon…</div>
      )}
    </div>
  )
}


