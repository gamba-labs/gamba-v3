import React from 'react'
import bs58 from 'bs58'
import { core, instructions } from '@gamba/sdk'
import { useWalletCtx } from './wallet/WalletContext'
import { useWalletAccountTransactionSendingSigner } from '@solana/react'
import { useSendSmartTransaction } from './wallet/useSendSmartTransaction'
import { type Base58EncodedBytes, type Address } from '@solana/kit'
import { useRpc } from './rpc/RpcContext'


type PoolAccount = { address: string; data: ReturnType<typeof core.getPoolDecoder> extends infer D ? D extends { decode: (u8: Uint8Array) => infer T } ? T : never : never }

function PlayGameForm() {
  const { account } = useWalletCtx()
  const signer = useWalletAccountTransactionSendingSigner(account!, 'solana:mainnet')
  const { simulate, send } = useSendSmartTransaction(signer)

  const [pools, setPools] = React.useState<PoolAccount[] | null>(null)
  const [selectedPool, setSelectedPool] = React.useState<string>('')
  const [wager, setWager] = React.useState<string>('0')
  const [bet, setBet] = React.useState<string>('20000,0') // bps 2x or 0
  const [clientSeed, setClientSeed] = React.useState<string>('seed')
  const [creatorFeeBps, setCreatorFeeBps] = React.useState<string>('0')
  const [jackpotFeeBps, setJackpotFeeBps] = React.useState<string>('0')
  const [metadata, setMetadata] = React.useState<string>('{}')
  const [creatorOverride, setCreatorOverride] = React.useState<string>('')

  const { rpc } = useRpc()

  const base64ToBytes = (b64: string) => {
    const bin = atob(b64)
    const out = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
    return out
  }

  React.useEffect(() => {
    ;(async () => {
      const disc = core.getPoolDiscriminatorBytes()
      const discB58 = bs58.encode(new Uint8Array(disc))
      const res = await rpc
        .getProgramAccounts(core.GAMBA_PROGRAM_ADDRESS, {
          filters: [
            { memcmp: { offset: 0n, bytes: discB58 as unknown as Base58EncodedBytes, encoding: 'base58' } },
          ],
          encoding: 'base64',
        })
        .send()
      const decoded: PoolAccount[] = res.map((item: any) => {
        const [b64] = item.account.data as [string, string]
        const bytes = base64ToBytes(b64)
        const data = core.getPoolDecoder().decode(bytes)
        return { address: String(item.pubkey), data }
      })
      setPools(decoded)
      if (decoded.length) setSelectedPool(decoded[0]!.address)
    })()
  }, [rpc])

  const selected = React.useMemo(() => pools?.find((p) => p.address === selectedPool) || null, [pools, selectedPool])

  

  // No longer needed: player/game/gamba derivations are handled inside the builder

  const onSubmit = async () => {
    if (!account) throw new Error('Connect wallet')
    if (!selected) throw new Error('Select a pool')

    const creatorStr = creatorOverride.trim()
    const creator = creatorStr ? (creatorStr as Address) : undefined
    const betArr = bet.split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n))

    const ix = await instructions.singleplayer.buildPlayGameInstruction({
      user: signer as unknown as any,
      pool: selected.address as Address,
      creator,
      creatorFeeBps: Number(creatorFeeBps || '0'),
      jackpotFeeBps: Number(jackpotFeeBps || '0'),
      wager: Number(wager || '0'),
      bet: betArr,
      clientSeed,
      metadata,
      rpc,
    })

    const sig = await send([ix])
    alert(`Sent tx: ${sig}`)
  }

  return (
    <div className="panel" style={{ marginTop: 16 }}>
      <h3>Play Game (demo)</h3>
      <div style={{ display: 'grid', gap: 8 }}>
        <div>
          <label>Pool (by underlying mint)</label>
          <select value={selectedPool} onChange={(e) => setSelectedPool(e.target.value)}>
            {pools?.map((p) => (
              <option key={p.address} value={p.address}>{String(p.data.underlyingTokenMint)}</option>
            ))}
          </select>
        </div>
        {selected && (
          <div style={{ display: 'grid', gap: 4, padding: 8, background: '#fafafa', borderRadius: 6 }}>
            <div>Underlying mint: <code>{String(selected.data.underlyingTokenMint)}</code></div>
            <div>Pool authority (info): <code>{String(selected.data.poolAuthority)}</code></div>
            <div>Liquidity: {selected.data.liquidityCheckpoint.toString()}</div>
            <div>Min wager: {selected.data.minWager.toString()}</div>
            <div>Max payout bps: {selected.data.customMaxPayoutBps.toString()}</div>
          </div>
        )}
        <div>
          <label>Creator address (optional)</label>
          <input value={creatorOverride} onChange={(e) => setCreatorOverride(e.target.value)} />
        </div>
        <div>
          <label>Wager (lamports)</label>
          <input value={wager} onChange={(e) => setWager(e.target.value)} />
        </div>
        <div>
          <label>Bet (comma-separated integers)</label>
          <input value={bet} onChange={(e) => setBet(e.target.value)} />
        </div>
        <div>
          <label>Client seed</label>
          <input value={clientSeed} onChange={(e) => setClientSeed(e.target.value)} />
        </div>
        <div>
          <label>Creator fee (bps)</label>
          <input value={creatorFeeBps} onChange={(e) => setCreatorFeeBps(e.target.value)} />
        </div>
        <div>
          <label>Jackpot fee (bps)</label>
          <input value={jackpotFeeBps} onChange={(e) => setJackpotFeeBps(e.target.value)} />
        </div>
        <div>
          <label>Metadata (string)</label>
          <input value={metadata} onChange={(e) => setMetadata(e.target.value)} />
        </div>
        
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button onClick={async () => {
          if (!account) return
          if (!selected) return
          const creatorStr = creatorOverride.trim()
          const creator = creatorStr ? (creatorStr as Address) : undefined
          const betArr = bet.split(',').map((s) => Number(s.trim())).filter((n) => Number.isFinite(n))
          const ix = await instructions.singleplayer.buildPlayGameInstruction({
            user: signer as unknown as any,
            pool: selected.address as Address,
            creator,
            creatorFeeBps: Number(creatorFeeBps || '0'),
            jackpotFeeBps: Number(jackpotFeeBps || '0'),
            wager: Number(wager || '0'),
            bet: betArr,
            clientSeed,
            metadata,
            rpc,
          })
          await simulate([ix])
        }}>Simulate</button>
        <button onClick={onSubmit}>Send PlayGame</button>
      </div>
    </div>
  )
}

export function PlayGameDemo() {
  const { account } = useWalletCtx()
  if (!account) return <div style={{ marginTop: 16 }}>Connect wallet to play.</div>
  return <PlayGameForm />
}

// Join multiplayer form moved to its own file


