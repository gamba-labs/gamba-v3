import React from 'react'
import { useWalletCtx } from '../../wallet/WalletContext'
import { useWalletAccountTransactionSendingSigner } from '@solana/react'
import { useSendSmartTransaction } from '../../wallet/useSendSmartTransaction'
import { instructions } from '@gamba/sdk'
import type { Address } from '@solana/kit'

const WSOL = 'So11111111111111111111111111111111111111112'

export function LeaveGame() {
  const { account } = useWalletCtx()
  if (!account) return <div className="muted">Connect wallet to leave a multiplayer game.</div>
  return <LeaveGameForm />
}

function LeaveGameForm() {
  const { account } = useWalletCtx()
  const signer = useWalletAccountTransactionSendingSigner(account!, 'solana:mainnet')
  const { simulate, send } = useSendSmartTransaction(signer)

  const [gameAccount, setGameAccount] = React.useState<string>('')
  const [mint, setMint] = React.useState<string>('')

  const buildIx = React.useCallback(async () => {
    const ix = await instructions.multiplayer.buildLeaveGameInstruction({
      user: signer as unknown as any,
      gameAccount: gameAccount as unknown as Address,
      mint: (mint?.trim() ? (mint as unknown as Address) : undefined) as Address,
    })
    return ix
  }, [signer, gameAccount, mint])

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
            <input value={mint} onChange={(e) => setMint(e.target.value)} placeholder={`Leave empty for native SOL (default WSOL: ${WSOL})`} />
            <small className="helper-text">Mint left empty → native SOL is used</small>
          </div>
        </div>
      </div>
      <div className="flex-row gap-8 mt-12">
        <button onClick={onSim}>Simulate</button>
        <button onClick={onSend}>Leave Game</button>
      </div>
    </div>
  )
}


