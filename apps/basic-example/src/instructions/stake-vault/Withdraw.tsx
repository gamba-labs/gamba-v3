import React from 'react'
import { useConnector } from '@solana/connector'
import { useSendSmartTransaction } from '../../wallet/useSendSmartTransaction'
import { instructions, stakeVault } from '@gamba/sdk'
import type { Address } from '@solana/kit'
import { useRpc } from '../../useRpc'

export function Withdraw() {
  const { isConnected } = useConnector()
  if (!isConnected) return <div className="muted">Connect wallet to withdraw from a vault.</div>
  return <Form />
}

function Form() {
  const { simulate, send, signer } = useSendSmartTransaction()
  const { rpc } = useRpc()

  const [vault, setVault] = React.useState<string>('')
  const [tokenMint, setTokenMint] = React.useState<string>('')
  const [sharesToBurn, setSharesToBurn] = React.useState<string>('0')

  React.useEffect(() => {
    const run = async () => {
      const v = (vault || '').trim()
      if (!v) return
      try {
        const acc = await stakeVault.fetchVault(rpc, v as unknown as Address)
        setTokenMint(String(acc.data.tokenMint))
      } catch {}
    }
    run()
  }, [rpc, vault])

  const buildIx = React.useCallback(async () => {
    if (!tokenMint.trim()) throw new Error('Token mint could not be resolved from vault; please check vault address')
    const ix = await instructions.stakeVault.buildWithdrawInstruction({
      staker: signer as unknown as any,
      vault: vault as unknown as Address,
      tokenMint: tokenMint as unknown as Address,
      sharesToBurn: Number(sharesToBurn || '0'),
    })
    return ix
  }, [signer, vault, tokenMint, sharesToBurn])

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
          <div className="form-label">Vault (address)</div>
          <input value={vault} onChange={(e) => setVault(e.target.value)} />
        </div>
        <div className="form-row">
          <div className="form-label">Token mint (address)</div>
          <input value={tokenMint} onChange={(e) => setTokenMint(e.target.value)} />
        </div>
        <div className="form-row">
          <div className="form-label">Shares to burn (u128)</div>
          <input value={sharesToBurn} onChange={(e) => setSharesToBurn(e.target.value)} />
        </div>
      </div>
      <div className="flex-row gap-8 mt-12">
        <button onClick={onSim}>Simulate</button>
        <button onClick={onSend}>Withdraw</button>
      </div>
    </div>
  )
}


