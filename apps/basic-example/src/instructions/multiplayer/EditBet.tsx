import React from 'react'
import { useConnector } from '@solana/connector'
import { useSendSmartTransaction } from '../../wallet/useSendSmartTransaction'
import { instructions } from '@gamba/sdk'
import type { Address } from '@solana/kit'

export function EditBet() {
  const { isConnected } = useConnector()
  if (!isConnected) return <div className="muted">Connect wallet to edit a bet.</div>
  return <Form />
}

function Form() {
  const { simulate, send, signer } = useSendSmartTransaction()

  const [gameAccount, setGameAccount] = React.useState<string>('')
  const [mint, setMint] = React.useState<string>('')
  const [wager, setWager] = React.useState<string>('0')
  const [team, setTeam] = React.useState<string>('0')
  const [creator, setCreator] = React.useState<string>('')
  const [creatorFeeBps, setCreatorFeeBps] = React.useState<string>('0')

  const buildIxs = React.useCallback(async () => {
    const [leaveIx, joinIx] = await instructions.multiplayer.buildEditBetInstructions({
      user: signer as unknown as any,
      gameAccount: gameAccount as unknown as Address,
      mint: (mint?.trim() ? (mint as unknown as Address) : undefined) as Address,
      wager: Number(wager || '0'),
      team: Number(team || '0'),
      creatorAddress: (creator.trim() ? (creator as unknown as Address) : undefined) as Address,
      creatorFeeBps: Number(creatorFeeBps || '0'),
    })
    return [leaveIx, joinIx]
  }, [signer, gameAccount, mint, wager, team, creator, creatorFeeBps])

  const onSim = async () => {
    const ixs = await buildIxs()
    await simulate(ixs)
  }
  const onSend = async () => {
    const ixs = await buildIxs()
    const sig = await send(ixs)
    alert(`Sent tx: ${sig}`)
  }

  return (
    <div className="grid gap-8">
      <div className="form">
        <div className="form-row">
          <div className="form-label">Game account (address)</div>
          <input value={gameAccount} onChange={(e) => setGameAccount(e.target.value)} />
        </div>
        <div className="form-row">
          <div className="form-label">Wager mint (address)</div>
          <div>
            <input value={mint} onChange={(e) => setMint(e.target.value)} placeholder="Leave empty for native SOL; enter SPL mint to use a token" />
            <small className="helper-text">Mint left empty → native SOL is used</small>
          </div>
        </div>
        <div className="form-row">
          <div className="form-label">New wager (lamports)</div>
          <input value={wager} onChange={(e) => setWager(e.target.value)} />
        </div>
        <div className="form-row">
          <div className="form-label">Team (optional)</div>
          <input value={team} onChange={(e) => setTeam(e.target.value)} />
        </div>
        <div className="form-row">
          <div className="form-label">Creator/referrer (optional)</div>
          <input value={creator} onChange={(e) => setCreator(e.target.value)} />
        </div>
        <div className="form-row">
          <div className="form-label">Creator fee (bps, optional)</div>
          <input value={creatorFeeBps} onChange={(e) => setCreatorFeeBps(e.target.value)} />
        </div>
      </div>
      <div className="flex-row gap-8 mt-12">
        <button onClick={onSim}>Simulate</button>
        <button onClick={onSend}>Edit Bet</button>
      </div>
    </div>
  )
}


