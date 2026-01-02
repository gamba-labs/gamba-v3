import React from 'react'
import { useConnector } from '@solana/connector'
import { useSendSmartTransaction } from '../../wallet/useSendSmartTransaction'
import { instructions } from '@gamba/sdk'
import type { Address } from '@solana/kit'

export function SelectWinners() {
  const { isConnected } = useConnector()
  if (!isConnected) return <div className="muted">Connect wallet to select winners.</div>
  return <SelectWinnersForm />
}

function SelectWinnersForm() {
  const { simulate, send, signer } = useSendSmartTransaction()

  const [gameAccount, setGameAccount] = React.useState<string>('')

  const buildIx = React.useCallback(async () => {
    const ix = await instructions.multiplayer.buildSelectWinnersInstruction({
      rng: signer as unknown as any,
      gameAccount: gameAccount as unknown as Address,
    })
    return ix
  }, [signer, gameAccount])

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
      </div>
      <div className="flex-row gap-8 mt-12">
        <button onClick={onSim}>Simulate</button>
        <button onClick={onSend}>Select Winners</button>
      </div>
    </div>
  )
}


