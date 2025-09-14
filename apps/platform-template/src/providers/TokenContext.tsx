import React from 'react'
import { core, pdas } from '@gamba/sdk'
import type { Address } from '@solana/kit'
import { TOKENS, DEFAULT_TOKEN_ID, DEFAULT_POOL_AUTHORITY } from '../config/constants'
import { useRpc } from './RpcContext'

export type TokenOption = {
  id: string
  ticker: string
}

export type SelectedPoolInfo = {
  token: TokenOption & { mint: Address }
  poolAddress: Address | null
  underlyingTokenMint: Address | null
}

type TokenContextType = {
  tokens: TokenOption[]
  selected: TokenOption
  setSelected: (t: TokenOption) => void
  selectedPool: SelectedPoolInfo | null
}

const TokenContext = React.createContext<TokenContextType | undefined>(undefined)

export function TokenProvider({ children }: { children: React.ReactNode }) {
  const { rpc } = useRpc()
  const options: TokenOption[] = React.useMemo(() => TOKENS.map((t) => ({ id: t.id, ticker: t.ticker })), [])
  const [selected, setSelected] = React.useState<TokenOption>(() => options.find((t) => t.id === DEFAULT_TOKEN_ID) ?? options[0])
  const [selectedPool, setSelectedPool] = React.useState<SelectedPoolInfo | null>(null)

  React.useEffect(() => {
    ;(async () => {
      const cfg = TOKENS.find((t) => t.id === selected.id)
      if (!cfg) { setSelectedPool(null); return }
      const token = { id: cfg.id, ticker: cfg.ticker, mint: cfg.mint }
      // Priority: explicit poolAddress -> derive from authority (defaulting to DEFAULT_POOL_AUTHORITY) -> fallback: scan on-chain for pools by discriminator and mint
      try {
        if (cfg.poolAddress) {
          setSelectedPool({ token, poolAddress: cfg.poolAddress, underlyingTokenMint: cfg.mint })
          return
        }
        const poolAuthority = (cfg.poolAuthority ?? DEFAULT_POOL_AUTHORITY) as Address
        try {
          const pool = await pdas.derivePoolPda(cfg.mint as Address, poolAuthority)
          setSelectedPool({ token, poolAddress: pool, underlyingTokenMint: cfg.mint })
          return
        } catch {}
        // Fallback: scan all pools and pick first matching mint
        const disc = core.getPoolDiscriminatorBytes()
        const discB58 = (await import('bs58')).default.encode(new Uint8Array(disc))
        const res: any[] = await rpc.getProgramAccounts(core.GAMBA_PROGRAM_ADDRESS, {
          filters: [
            { memcmp: { offset: 0n, bytes: discB58 as any, encoding: 'base58' } },
          ],
          encoding: 'base64',
        }).send()
        let match: Address | null = null
        for (const item of res) {
          const [b64] = item.account.data as [string, string]
          const bin = atob(b64)
          const bytes = new Uint8Array(bin.length)
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
          const data = core.getPoolDecoder().decode(bytes)
          if (String(data.underlyingTokenMint) === String(cfg.mint)) {
            match = String(item.pubkey) as Address
            break
          }
        }
        setSelectedPool({ token, poolAddress: match, underlyingTokenMint: cfg.mint })
      } catch {
        setSelectedPool({ token, poolAddress: null, underlyingTokenMint: cfg.mint })
      }
    })()
  }, [rpc, selected])

  const value = React.useMemo<TokenContextType>(() => ({ tokens: options, selected, setSelected, selectedPool }), [options, selected, selectedPool])
  return <TokenContext.Provider value={value}>{children}</TokenContext.Provider>
}

export function useToken() {
  const ctx = React.useContext(TokenContext)
  if (!ctx) throw new Error('useToken must be used within TokenProvider')
  return ctx
}


