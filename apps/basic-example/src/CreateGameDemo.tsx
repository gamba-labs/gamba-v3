import React from 'react'
import { useWalletCtx } from './wallet/WalletContext'
import { useWalletAccountTransactionSendingSigner } from '@solana/react'
import { useSendSmartTransaction } from './wallet/useSendSmartTransaction'
import { instructions } from '@gamba/sdk'
import type { Address } from '@solana/kit'

const WSOL = 'So11111111111111111111111111111111111111112'

export function CreateGameDemo() {
  const { account } = useWalletCtx()
  if (!account) return <div className="panel" style={{ marginTop: 16, padding: 12 }}>Connect wallet to create a multiplayer game.</div>
  return <CreateGameForm />
}

function CreateGameForm() {
  const { account } = useWalletCtx()
  const signer = useWalletAccountTransactionSendingSigner(account!, 'solana:mainnet')
  const { simulate, send } = useSendSmartTransaction(signer)

  const [mint, setMint] = React.useState<string>(WSOL)
  const [maxPlayers, setMaxPlayers] = React.useState<string>('10')
  const [winnersTarget, setWinnersTarget] = React.useState<string>('1')
  const [wagerType, setWagerType] = React.useState<string>('0')
  const [payoutType, setPayoutType] = React.useState<string>('0')
  const [wager, setWager] = React.useState<string>('0')
  const [softDuration, setSoftDuration] = React.useState<string>('60')

  // Optional
  const [preAllocPlayers, setPreAllocPlayers] = React.useState<string>('')
  const [numTeams, setNumTeams] = React.useState<string>('')
  const [hardDuration, setHardDuration] = React.useState<string>('')
  const [minBet, setMinBet] = React.useState<string>('0')
  const [maxBet, setMaxBet] = React.useState<string>('0')
  const [gameSeed, setGameSeed] = React.useState<string>('')

  const buildIx = React.useCallback(async () => {
    const trimmedMint = mint.trim()
    const isSpl = trimmedMint.length > 0 && trimmedMint !== WSOL
    const common = {
      user: signer as unknown as any,
      maxPlayers: Number(maxPlayers || '0'),
      winnersTarget: Number(winnersTarget || '0'),
      wagerType: Number(wagerType || '0'),
      payoutType: Number(payoutType || '0'),
      wager: Number(wager || '0'),
      softDuration: Number(softDuration || '0'),
      ...(preAllocPlayers.trim() ? { preAllocPlayers: Number(preAllocPlayers) } : {}),
      ...(numTeams.trim() ? { numTeams: Number(numTeams) } : {}),
      ...(hardDuration.trim() ? { hardDuration: Number(hardDuration) } : {}),
      minBet: Number(minBet || '0'),
      maxBet: Number(maxBet || '0'),
      ...(gameSeed.trim() ? { gameSeed: BigInt(gameSeed) } : {}),
    }
    if (isSpl) {
      return instructions.multiplayer.buildCreateGameSplInstruction({
        ...common,
        mint: trimmedMint as unknown as Address,
      })
    }
    return instructions.multiplayer.buildCreateGameNativeInstruction(common as any)
  }, [signer, mint, maxPlayers, winnersTarget, wagerType, payoutType, wager, softDuration, preAllocPlayers, numTeams, hardDuration, minBet, maxBet, gameSeed])

  const onSim = async () => {
    const ix = await buildIx()
    await simulate([ix])
  }
  const onSend = async () => {
    const ix = await buildIx()
    const sig = await send([ix])
    alert(`Sent tx: ${sig}`)
  }

  return (
    <div className="panel" style={{ marginTop: 16 }}>
      <h3>Create Multiplayer Game (demo)</h3>
      <div style={{ display: 'grid', gap: 8 }}>
        <div>
          <label>Wager mint (address)</label>
          <input 
            value={mint} 
            onChange={(e) => setMint(e.target.value)} 
            placeholder={WSOL}
          />
          <small style={{ display: 'block', marginTop: 4, color: '#666' }}>
            Default is WSOL. Leave as WSOL for native, change to SPL mint for token games.
          </small>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
          <div>
            <label>Max players</label>
            <input value={maxPlayers} onChange={(e) => setMaxPlayers(e.target.value)} />
          </div>
          <div>
            <label>Winners target</label>
            <input value={winnersTarget} onChange={(e) => setWinnersTarget(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
          <div>
            <label>Wager type</label>
            <input value={wagerType} onChange={(e) => setWagerType(e.target.value)} />
          </div>
          <div>
            <label>Payout type</label>
            <input value={payoutType} onChange={(e) => setPayoutType(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
          <div>
            <label>Wager (units of mint)</label>
            <input value={wager} onChange={(e) => setWager(e.target.value)} />
          </div>
          <div>
            <label>Soft duration (secs)</label>
            <input value={softDuration} onChange={(e) => setSoftDuration(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
          <div>
            <label>Pre-alloc players (optional)</label>
            <input value={preAllocPlayers} onChange={(e) => setPreAllocPlayers(e.target.value)} />
          </div>
          <div>
            <label>Teams (optional)</label>
            <input value={numTeams} onChange={(e) => setNumTeams(e.target.value)} />
          </div>
          <div>
            <label>Hard duration (secs, optional)</label>
            <input value={hardDuration} onChange={(e) => setHardDuration(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
          <div>
            <label>Min bet</label>
            <input value={minBet} onChange={(e) => setMinBet(e.target.value)} />
          </div>
          <div>
            <label>Max bet</label>
            <input value={maxBet} onChange={(e) => setMaxBet(e.target.value)} />
          </div>
        </div>
        <div>
          <label>Game seed (optional u64)</label>
          <input value={gameSeed} onChange={(e) => setGameSeed(e.target.value)} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button onClick={onSim}>Simulate</button>
        <button onClick={onSend}>Create Game</button>
      </div>
    </div>
  )
}


