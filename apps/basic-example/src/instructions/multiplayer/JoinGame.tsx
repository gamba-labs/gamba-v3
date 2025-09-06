import React from 'react'
import { useWalletCtx } from '../../wallet/WalletContext'
import { useWalletAccountTransactionSendingSigner } from '@solana/react'
import { useSendSmartTransaction } from '../../wallet/useSendSmartTransaction'
import { instructions } from '@gamba/sdk'
import type { Address } from '@solana/kit'

export function JoinGame() {
  const { account } = useWalletCtx()
  if (!account) return <div className="muted">Connect wallet to join multiplayer.</div>
  return <JoinGameForm />
}

function JoinGameForm() {
  const { account } = useWalletCtx()
  const signer = useWalletAccountTransactionSendingSigner(account!, 'solana:mainnet')
  const { simulate, send } = useSendSmartTransaction(signer)
  // const { rpc } = useRpc()

  const [gameAccount, setGameAccount] = React.useState<string>('')
  const [mint, setMint] = React.useState<string>('')
  const [creator, setCreator] = React.useState<string>('')
  const [wager, setWager] = React.useState<string>('0')
  const [team, setTeam] = React.useState<string>('0')

  const buildIx = React.useCallback(async () => {
    const creatorAddr = (creator.trim() || account!.address) as unknown as Address
    const ix = await instructions.multiplayer.buildJoinGameInstruction({
      user: signer as unknown as any,
      gameAccount: gameAccount as unknown as Address,
      mint: (mint?.trim() ? (mint as unknown as Address) : undefined) as Address,
      creatorAddress: creatorAddr as Address,
      wager: Number(wager || '0'),
      team: Number(team || '0'),
    })
    return ix
  }, [gameAccount, mint, creator, signer, wager, team])

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
          <div className="form-label">Creator/referrer (optional)</div>
          <input value={creator} onChange={(e) => setCreator(e.target.value)} />
        </div>
        <div className="form-row">
          <div className="form-label">Wager (lamports)</div>
          <input value={wager} onChange={(e) => setWager(e.target.value)} />
        </div>
        <div className="form-row">
          <div className="form-label">Team (optional)</div>
          <input value={team} onChange={(e) => setTeam(e.target.value)} />
        </div>
      </div>
      <div className="flex-row gap-8 mt-12">
        <button onClick={onSim}>Simulate</button>
        <button onClick={onSend}>Join Game</button>
      </div>
    </div>
  )
}


