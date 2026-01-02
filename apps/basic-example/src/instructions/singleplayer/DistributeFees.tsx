import React from 'react'
import { useConnector } from '@solana/connector'
import { useSendSmartTransaction } from '../../wallet/useSendSmartTransaction'
import { core, pdas, instructions } from '@gamba/sdk'
import type { Address } from '@solana/kit'
import { useRpc } from '../../rpc/RpcContext'

export function DistributeFees() {
  const { isConnected } = useConnector()
  if (!isConnected) return <div className="muted">Connect wallet to distribute fees.</div>
  return <Form />
}

function Form() {
  const { simulate, send, signer } = useSendSmartTransaction()
  const { rpc } = useRpc()

  const [underlyingMint, setUnderlyingMint] = React.useState<string>('')
  const [recipient, setRecipient] = React.useState<string>('')
  const [nativeSol, setNativeSol] = React.useState<boolean>(false)

  React.useEffect(() => {
    ;(async () => {
      try {
        const gs = await pdas.deriveGambaStatePda()
        const acc = await core.fetchGambaState(rpc, gs as Address)
        setRecipient(String(acc.data.distributionRecipient))
      } catch (e) {
        // ignore – leave field editable if fetch fails
      }
    })()
  }, [rpc])

  const buildIx = React.useCallback(async () => {
    if (!underlyingMint.trim() || !recipient.trim()) throw new Error('Fill required fields')
    const ix = await instructions.singleplayer.buildDistributeFeesInstruction({
      user: signer as unknown as any,
      underlyingTokenMint: underlyingMint as unknown as Address,
      distributionRecipient: recipient as unknown as Address,
      nativeSol,
    })
    return ix
  }, [signer, underlyingMint, recipient, nativeSol])

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
          <div className="form-label">Underlying token mint</div>
          <input value={underlyingMint} onChange={(e) => setUnderlyingMint(e.target.value)} />
        </div>
        <div className="form-row">
          <div className="form-label">Recipient address</div>
          <input value={recipient} onChange={(e) => setRecipient(e.target.value)} readOnly />
        </div>
        <div className="form-row">
          <div className="form-label">Native SOL</div>
          <input type="checkbox" checked={nativeSol} onChange={(e) => setNativeSol(e.target.checked)} />
        </div>
      </div>
      <div className="flex-row gap-8 mt-12">
        <button onClick={onSim}>Simulate</button>
        <button onClick={onSend}>Distribute Fees</button>
      </div>
    </div>
  )
}


