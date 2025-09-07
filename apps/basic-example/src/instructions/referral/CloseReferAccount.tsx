import React from 'react'
import { useWalletCtx } from '../../wallet/WalletContext'
import { useWalletAccountTransactionSendingSigner } from '@solana/react'
import { useSendSmartTransaction } from '../../wallet/useSendSmartTransaction'
import { instructions } from '@gamba/sdk'
import type { Address } from '@solana/kit'

export function CloseReferAccount() {
  const { account } = useWalletCtx()
  if (!account) return <div className="muted">Connect wallet to close referral.</div>
  return <Form />
}

function Form() {
  const { account } = useWalletCtx()
  const signer = useWalletAccountTransactionSendingSigner(account!, 'solana:mainnet')
  const { simulate, send } = useSendSmartTransaction(signer)

  const [creator, setCreator] = React.useState<string>('')

  const buildIx = React.useCallback(async () => {
    const ix = await instructions.referral.buildCloseReferAccountInstruction({
      authority: signer as unknown as any,
      creator: creator as unknown as Address,
    })
    return ix
  }, [signer, creator])

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
          <div className="form-label">Creator (address)</div>
          <input value={creator} onChange={(e) => setCreator(e.target.value)} />
        </div>
      </div>
      <div className="flex-row gap-8 mt-12">
        <button onClick={onSim}>Simulate</button>
        <button onClick={onSend}>Close Referral</button>
      </div>
    </div>
  )
}


