import React from 'react'
import { useConnector } from '@solana/connector'
import { useSendSmartTransaction } from '../../wallet/useSendSmartTransaction'
import bs58 from 'bs58'
import { instructions, stakeVault } from '@gamba/core'
import type { Address, Base58EncodedBytes } from '@solana/kit'
import { useRpc } from '../../useRpc'

export function Deposit() {
  const { isConnected } = useConnector()
  if (!isConnected) return <div className="muted">Connect wallet to deposit into a vault.</div>
  return <Form />
}

function Form() {
  const { simulate, send, signer } = useSendSmartTransaction()
  const { rpc } = useRpc()

  const [vault, setVault] = React.useState<string>('')
  const [tokenMint, setTokenMint] = React.useState<string>('')
  const [amount, setAmount] = React.useState<string>('0')
  const [vaults, setVaults] = React.useState<string[]>([])
  const [fetching, setFetching] = React.useState<boolean>(false)

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

  const onFetchVaults = React.useCallback(async () => {
    setFetching(true)
    try {
      const disc = stakeVault.getVaultDiscriminatorBytes()
      const discB58 = bs58.encode(new Uint8Array(disc))
      const res: any[] = await rpc.getProgramAccounts(stakeVault.STAKE_VAULT_PROGRAM_ADDRESS, {
        filters: [
          { memcmp: { offset: 0n, bytes: discB58 as unknown as Base58EncodedBytes, encoding: 'base58' } },
        ],
        encoding: 'base64',
      }).send()
      const list: string[] = res.map((e: any) => String(e.pubkey))
      setVaults(list.filter(Boolean))
    } catch (e) {
      console.error('fetch vaults failed', e)
      setVaults([])
    } finally {
      setFetching(false)
    }
  }, [rpc])

  const buildIx = React.useCallback(async () => {
    if (!tokenMint.trim()) throw new Error('Token mint could not be resolved from vault; please check vault address')
    const ix = await instructions.stakeVault.buildDepositInstruction({
      staker: signer as unknown as any,
      vault: vault as unknown as Address,
      tokenMint: tokenMint as unknown as Address,
      depositAmount: Number(amount || '0'),
    })
    return ix
  }, [signer, vault, tokenMint, amount])

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
        {tokenMint && (
          <div className="form-row">
            <div className="form-label">Resolved mint</div>
            <input value={tokenMint} readOnly />
          </div>
        )}
        <div className="form-row">
          <div className="form-label">Amount (u64)</div>
          <input value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
      </div>
      <div className="flex-row gap-8 mt-12">
        <button onClick={onSim}>Simulate</button>
        <button onClick={onSend}>Deposit</button>
        <button onClick={onFetchVaults} disabled={fetching}>{fetching ? 'Fetching…' : 'Fetch Vaults'}</button>
      </div>
      {vaults.length > 0 && (
        <div className="form mt-12">
          <div className="form-row">
            <div className="form-label">Vaults</div>
            <div>
              <div className="grid gap-8">
                {vaults.map((vAddr) => (
                  <div key={vAddr} className="flex-row" style={{ gap: 8 }}>
                    <input value={vAddr} readOnly />
                    <button onClick={() => setVault(vAddr)}>Use</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


