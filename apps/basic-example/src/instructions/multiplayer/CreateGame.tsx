import React from 'react'
import { useConnector } from '@solana/connector'
import { useSendSmartTransaction } from '../../wallet/useSendSmartTransaction'
import { instructions } from '@gamba/sdk'
import type { Address } from '@solana/kit'

const WSOL = 'So11111111111111111111111111111111111111112'

export function CreateGame() {
  const { isConnected } = useConnector()
  if (!isConnected) return <div className="muted">Connect wallet to create a multiplayer game.</div>
  return <CreateGameForm />
}

function CreateGameForm() {
  const { simulate, send, signer } = useSendSmartTransaction()

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
    <div className="grid gap-8">
      <div className="form">
        <div className="form-row">
          <div className="form-label">Wager mint (address)</div>
          <input value={mint} onChange={(e) => setMint(e.target.value)} placeholder={WSOL} />
        </div>
        <div className="form-row">
          <div className="form-label">Wager (units of mint)</div>
          <input value={wager} onChange={(e) => setWager(e.target.value)} />
        </div>
        <div className="form-row">
          <div className="form-label">Soft duration (secs)</div>
          <input value={softDuration} onChange={(e) => setSoftDuration(e.target.value)} />
        </div>
        <div className="form-row">
          <div className="form-label">Wager type</div>
          <input value={wagerType} onChange={(e) => setWagerType(e.target.value)} />
        </div>
        <div className="form-row">
          <div className="form-label">Payout type</div>
          <input value={payoutType} onChange={(e) => setPayoutType(e.target.value)} />
        </div>
        <div className="form-row">
          <div className="form-label">Min bet</div>
          <input value={minBet} onChange={(e) => setMinBet(e.target.value)} />
        </div>
        <div className="form-row">
          <div className="form-label">Max bet</div>
          <input value={maxBet} onChange={(e) => setMaxBet(e.target.value)} />
        </div>
        <div className="form-row">
          <div className="form-label">Max players</div>
          <input value={maxPlayers} onChange={(e) => setMaxPlayers(e.target.value)} />
        </div>
        <div className="form-row">
          <div className="form-label">Winners target</div>
          <input value={winnersTarget} onChange={(e) => setWinnersTarget(e.target.value)} />
        </div>
        <div className="form-row">
          <div className="form-label">Pre-alloc players (optional)</div>
          <input value={preAllocPlayers} onChange={(e) => setPreAllocPlayers(e.target.value)} />
        </div>
        <div className="form-row">
          <div className="form-label">Teams (optional)</div>
          <input value={numTeams} onChange={(e) => setNumTeams(e.target.value)} />
        </div>
        <div className="form-row">
          <div className="form-label">Hard duration (secs, optional)</div>
          <input value={hardDuration} onChange={(e) => setHardDuration(e.target.value)} />
        </div>
        <div className="form-row">
          <div className="form-label">Game seed (optional u64)</div>
          <input value={gameSeed} onChange={(e) => setGameSeed(e.target.value)} />
        </div>
      </div>

      <div className="flex-row gap-8 mt-12">
        <button onClick={onSim}>Simulate</button>
        <button onClick={onSend}>Create Game</button>
      </div>
    </div>
  )
}


