import React from 'react'
import { useWalletCtx } from '../../wallet/WalletContext'
import { useWalletAccountTransactionSendingSigner } from '@solana/react'
import { useSendSmartTransaction } from '../../wallet/useSendSmartTransaction'
import { instructions } from '@gamba/sdk'
import type { Address } from '@solana/kit'

export function InitializeVault() {
  const { account } = useWalletCtx()
  if (!account) return <div className="muted">Connect wallet to initialize a vault.</div>
  return <Form />
}

function Form() {
  const { account } = useWalletCtx()
  const signer = useWalletAccountTransactionSendingSigner(account!, 'solana:mainnet')
  const { simulate, send } = useSendSmartTransaction(signer)

  const [tokenMint, setTokenMint] = React.useState<string>('')
  const [vaultId, setVaultId] = React.useState<string>('0')
  const [withdrawFeeBps, setWithdrawFeeBps] = React.useState<string>('0')

  const buildIx = React.useCallback(async () => {
    if (!tokenMint.trim()) throw new Error('Token mint is required')
    if (Number.isNaN(Number(vaultId))) throw new Error('Vault ID must be a number')
    if (Number.isNaN(Number(withdrawFeeBps))) throw new Error('Withdraw fee bps must be a number')
    const ix = await instructions.stakeVault.buildInitializeVaultInstruction({
      authority: signer as unknown as any,
      tokenMint: tokenMint as unknown as Address,
      vaultId: Number(vaultId || '0'),
      withdrawFeeBps: Number(withdrawFeeBps || '0'),
    })
    return ix
  }, [signer, tokenMint, vaultId, withdrawFeeBps])

  const onSim = async () => {
    try {
      const ix = await buildIx()
      await simulate([ix])
    } catch (e: any) {
      alert(e?.message ?? String(e))
      throw e
    }
  }
  const onSend = async () => {
    try {
      const ix = await buildIx()
      const sig = await send([ix])
      alert(`Sent tx: ${sig}`)
    } catch (e: any) {
      alert(e?.message ?? String(e))
      throw e
    }
  }

  return (
    <div className="grid gap-8">
      <div className="form">
        <div className="form-row">
          <div className="form-label">Token mint (address)</div>
          <input value={tokenMint} onChange={(e) => setTokenMint(e.target.value)} />
        </div>
        <div className="form-row">
          <div className="form-label">Vault ID</div>
          <input value={vaultId} onChange={(e) => setVaultId(e.target.value)} />
        </div>
        <div className="form-row">
          <div className="form-label">Withdraw fee (bps)</div>
          <input value={withdrawFeeBps} onChange={(e) => setWithdrawFeeBps(e.target.value)} />
        </div>
      </div>
      <div className="flex-row gap-8 mt-12">
        <button onClick={onSim}>Simulate</button>
        <button onClick={onSend}>Initialize Vault</button>
      </div>
    </div>
  )
}


