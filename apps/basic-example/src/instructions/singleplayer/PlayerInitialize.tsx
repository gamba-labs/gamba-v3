import React from 'react'
import { useWalletCtx } from '../../wallet/WalletContext'
import { useWalletAccountTransactionSendingSigner } from '@solana/react'
import { useSendSmartTransaction } from '../../wallet/useSendSmartTransaction'
import { instructions } from '@gamba/sdk'
import type { Address } from '@solana/kit'

export function PlayerInitialize() {
  const { account } = useWalletCtx()
  if (!account) return <div className="muted">Connect wallet to initialize player.</div>
  return <Form />
}

function Form() {
  const { account } = useWalletCtx()
  const signer = useWalletAccountTransactionSendingSigner(account!, 'solana:mainnet')
  const { simulate, send } = useSendSmartTransaction(signer)

  const [player, setPlayer] = React.useState<string>('')
  const [game, setGame] = React.useState<string>('')

  const buildIx = React.useCallback(async () => {
    const ix = await instructions.singleplayer.buildPlayerInitializeInstruction({
      user: signer as unknown as any,
      player: player.trim() ? (player as unknown as Address) : undefined,
      game: game.trim() ? (game as unknown as Address) : undefined,
    })
    return ix
  }, [signer, player, game])

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
          <div className="form-label">Player PDA (optional)</div>
          <input value={player} onChange={(e) => setPlayer(e.target.value)} placeholder="Auto-derived if empty" />
        </div>
        <div className="form-row">
          <div className="form-label">Game PDA (optional)</div>
          <input value={game} onChange={(e) => setGame(e.target.value)} placeholder="Auto-derived if empty" />
        </div>
      </div>
      <div className="flex-row gap-8 mt-12">
        <button onClick={onSim}>Simulate</button>
        <button onClick={onSend}>Initialize Player</button>
      </div>
    </div>
  )
}


