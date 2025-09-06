import React from 'react'
import { useWalletCtx } from '../../wallet/WalletContext'
import { useWalletAccountTransactionSendingSigner } from '@solana/react'
import { useSendSmartTransaction } from '../../wallet/useSendSmartTransaction'
import { instructions, pdas } from '@gamba/sdk'
import type { Address } from '@solana/kit'

export function PoolInitialize() {
  const { account } = useWalletCtx()
  if (!account) return <div className="muted">Connect wallet to initialize a pool.</div>
  return <Form />
}

function Form() {
  const { account } = useWalletCtx()
  const signer = useWalletAccountTransactionSendingSigner(account!, 'solana:mainnet')
  const { simulate, send } = useSendSmartTransaction(signer)

  const [underlyingMint, setUnderlyingMint] = React.useState<string>('')
  const [poolAuthority, setPoolAuthority] = React.useState<string>('')
  const [lookupAddress, setLookupAddress] = React.useState<string>('')

  const buildIx = React.useCallback(async () => {
    if (!underlyingMint.trim() || !poolAuthority.trim() || !lookupAddress.trim()) {
      throw new Error('Fill all fields')
    }
    const gs = await pdas.deriveGambaStatePda()
    const gambaStateAta = await pdas.deriveAta(gs as Address, underlyingMint as unknown as Address)
    const ix = await instructions.singleplayer.buildPoolInitializeInstruction({
      initializer: signer as unknown as any,
      underlyingTokenMint: underlyingMint as unknown as Address,
      poolAuthority: poolAuthority as unknown as Address,
      lookupAddress: lookupAddress as unknown as Address,
      gambaStateAta,
    })
    return ix
  }, [signer, underlyingMint, poolAuthority, lookupAddress])

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
      <div className="panel panel-tight" style={{ background: '#fffbe6' }}>
        <strong>Warning:</strong> You must create and freeze a lookup table first, then paste its address below.
      </div>
      <div className="form">
        <div className="form-row">
          <div className="form-label">Underlying token mint</div>
          <input value={underlyingMint} onChange={(e) => setUnderlyingMint(e.target.value)} />
        </div>
        <div className="form-row">
          <div className="form-label">Pool authority</div>
          <input value={poolAuthority} onChange={(e) => setPoolAuthority(e.target.value)} />
        </div>
        <div className="form-row">
          <div className="form-label">Lookup address</div>
          <input value={lookupAddress} onChange={(e) => setLookupAddress(e.target.value)} />
        </div>
      </div>
      <div className="flex-row gap-8 mt-12">
        <button onClick={onSim}>Simulate</button>
        <button onClick={onSend}>Initialize Pool</button>
      </div>
    </div>
  )
}


