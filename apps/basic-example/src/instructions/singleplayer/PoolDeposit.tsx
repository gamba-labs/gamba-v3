import React from 'react'
import { useWalletCtx } from '../../wallet/WalletContext'
import { useWalletAccountTransactionSendingSigner } from '@solana/react'
import { useSendSmartTransaction } from '../../wallet/useSendSmartTransaction'
import { instructions } from '@gamba/sdk'
import type { Address } from '@solana/kit'

export function PoolDeposit() {
  const { account } = useWalletCtx()
  if (!account) return <div className="muted">Connect wallet to deposit to pool.</div>
  return <Form />
}

function Form() {
  const { account } = useWalletCtx()
  const signer = useWalletAccountTransactionSendingSigner(account!, 'solana:mainnet')
  const { simulate, send } = useSendSmartTransaction(signer)

  const [pool, setPool] = React.useState<string>('')
  const [underlyingMint, setUnderlyingMint] = React.useState<string>('')
  const [amount, setAmount] = React.useState<string>('0')

  const buildIx = React.useCallback(async () => {
    if (!pool.trim() || !underlyingMint.trim()) throw new Error('Fill required fields')
    const ix = await instructions.singleplayer.buildPoolDepositInstruction({
      user: signer as unknown as any,
      pool: pool as unknown as Address,
      underlyingTokenMint: underlyingMint as unknown as Address,
      amount: Number(amount || '0'),
    })
    return ix
  }, [signer, pool, underlyingMint, amount])

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
          <div className="form-label">Pool address</div>
          <input value={pool} onChange={(e) => setPool(e.target.value)} />
        </div>
        <div className="form-row">
          <div className="form-label">Underlying token mint</div>
          <input value={underlyingMint} onChange={(e) => setUnderlyingMint(e.target.value)} />
        </div>
        <div className="form-row">
          <div className="form-label">Amount</div>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
      </div>
      <div className="flex-row gap-8 mt-12">
        <button onClick={onSim}>Simulate</button>
        <button onClick={onSend}>Deposit</button>
      </div>
    </div>
  )
}


