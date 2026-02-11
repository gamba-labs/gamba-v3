import { core } from '@gamba/core'
import type { Address } from '@solana/kit'
import bs58 from 'bs58'

export type DecodedGambaInstructionName =
  | 'playGame'
  | 'playerInitialize'
  | 'playerClaim'
  | 'playerClose'
  | 'poolInitialize'
  | 'poolDeposit'
  | 'poolWithdraw'
  | 'poolMintBonusTokens'
  | 'poolAuthorityConfig'
  | 'poolGambaConfig'
  | 'distributeFees'
  | 'gambaSetConfig'
  | 'gambaSetAuthority'
  | 'gambaInitialize'
  | 'rngProvideHashedSeed'
  | 'rngSettle'

export type DecodedGambaInstruction = {
  name: DecodedGambaInstructionName
  programAddress: string
  accountAddresses: string[]
  data: Record<string, unknown>
  stackHeight?: number | null
  index: number
  signature: string
  source: 'top-level' | 'inner'
}

const DECODERS: Array<{
  name: DecodedGambaInstructionName
  discriminator: Uint8Array
  parse: (instruction: any) => { data: Record<string, unknown> }
}> = [
  {
    name: 'playGame',
    discriminator: core.PLAY_GAME_DISCRIMINATOR,
    parse: (instruction) => core.parsePlayGameInstruction(instruction as any),
  },
  {
    name: 'playerInitialize',
    discriminator: core.PLAYER_INITIALIZE_DISCRIMINATOR,
    parse: (instruction) => core.parsePlayerInitializeInstruction(instruction as any),
  },
  {
    name: 'playerClaim',
    discriminator: core.PLAYER_CLAIM_DISCRIMINATOR,
    parse: (instruction) => core.parsePlayerClaimInstruction(instruction as any),
  },
  {
    name: 'playerClose',
    discriminator: core.PLAYER_CLOSE_DISCRIMINATOR,
    parse: (instruction) => core.parsePlayerCloseInstruction(instruction as any),
  },
  {
    name: 'poolInitialize',
    discriminator: core.POOL_INITIALIZE_DISCRIMINATOR,
    parse: (instruction) => core.parsePoolInitializeInstruction(instruction as any),
  },
  {
    name: 'poolDeposit',
    discriminator: core.POOL_DEPOSIT_DISCRIMINATOR,
    parse: (instruction) => core.parsePoolDepositInstruction(instruction as any),
  },
  {
    name: 'poolWithdraw',
    discriminator: core.POOL_WITHDRAW_DISCRIMINATOR,
    parse: (instruction) => core.parsePoolWithdrawInstruction(instruction as any),
  },
  {
    name: 'poolMintBonusTokens',
    discriminator: core.POOL_MINT_BONUS_TOKENS_DISCRIMINATOR,
    parse: (instruction) => core.parsePoolMintBonusTokensInstruction(instruction as any),
  },
  {
    name: 'poolAuthorityConfig',
    discriminator: core.POOL_AUTHORITY_CONFIG_DISCRIMINATOR,
    parse: (instruction) => core.parsePoolAuthorityConfigInstruction(instruction as any),
  },
  {
    name: 'poolGambaConfig',
    discriminator: core.POOL_GAMBA_CONFIG_DISCRIMINATOR,
    parse: (instruction) => core.parsePoolGambaConfigInstruction(instruction as any),
  },
  {
    name: 'distributeFees',
    discriminator: core.DISTRIBUTE_FEES_DISCRIMINATOR,
    parse: (instruction) => core.parseDistributeFeesInstruction(instruction as any),
  },
  {
    name: 'gambaSetConfig',
    discriminator: core.GAMBA_SET_CONFIG_DISCRIMINATOR,
    parse: (instruction) => core.parseGambaSetConfigInstruction(instruction as any),
  },
  {
    name: 'gambaSetAuthority',
    discriminator: core.GAMBA_SET_AUTHORITY_DISCRIMINATOR,
    parse: (instruction) => core.parseGambaSetAuthorityInstruction(instruction as any),
  },
  {
    name: 'gambaInitialize',
    discriminator: core.GAMBA_INITIALIZE_DISCRIMINATOR,
    parse: (instruction) => core.parseGambaInitializeInstruction(instruction as any),
  },
  {
    name: 'rngProvideHashedSeed',
    discriminator: core.RNG_PROVIDE_HASHED_SEED_DISCRIMINATOR,
    parse: (instruction) => core.parseRngProvideHashedSeedInstruction(instruction as any),
  },
  {
    name: 'rngSettle',
    discriminator: core.RNG_SETTLE_DISCRIMINATOR,
    parse: (instruction) => core.parseRngSettleInstruction(instruction as any),
  },
]

function hasPrefix(data: Uint8Array, discriminator: Uint8Array) {
  if (data.length < discriminator.length) return false
  for (let i = 0; i < discriminator.length; i++) {
    if (data[i] !== discriminator[i]) return false
  }
  return true
}

function normalizeDataValues(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => {
      if (typeof value === 'bigint') return [key, value.toString()]
      if (Array.isArray(value)) {
        return [
          key,
          value.map((entry) => (typeof entry === 'bigint' ? entry.toString() : entry)),
        ]
      }
      if (value && typeof value === 'object') {
        return [key, normalizeDataValues(value as Record<string, unknown>)]
      }
      return [key, value]
    }),
  )
}

function normalizeAccounts(parsedInstruction: any): string[] {
  const accounts = parsedInstruction?.accounts ?? {}
  return Object.values(accounts).flatMap((value) => {
    if (!value) return []
    if (typeof value === 'string') return [value]
    if (Array.isArray(value)) {
      return value
        .map((entry) => {
          if (!entry) return null
          if (typeof entry.address === 'string') return entry.address
          if (typeof entry === 'string') return entry
          return null
        })
        .filter((entry): entry is string => !!entry)
    }
    if (typeof value === 'object' && 'address' in value && typeof (value as any).address === 'string') {
      return [(value as any).address]
    }
    return []
  })
}

function decodeInstruction(
  params: {
    programAddress: string
    accounts: string[]
    dataBase58: string
    signature: string
    source: 'top-level' | 'inner'
    index: number
    stackHeight?: number | null
  },
): DecodedGambaInstruction | null {
  if (params.programAddress !== core.GAMBA_PROGRAM_ADDRESS) return null

  let raw: Uint8Array
  try {
    raw = bs58.decode(params.dataBase58)
  } catch {
    return null
  }

  for (const decoder of DECODERS) {
    if (!hasPrefix(raw, decoder.discriminator)) continue

    try {
      const parsed = decoder.parse({
        programAddress: params.programAddress,
        accounts: params.accounts.map((address) => ({ address })),
        data: raw,
      })

      return {
        name: decoder.name,
        programAddress: params.programAddress,
        accountAddresses: normalizeAccounts(parsed),
        data: normalizeDataValues(parsed.data as Record<string, unknown>),
        stackHeight: params.stackHeight ?? null,
        index: params.index,
        signature: params.signature,
        source: params.source,
      }
    } catch {
      return null
    }
  }

  return null
}

function toAddressText(value: unknown): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'object') {
    if ('toBase58' in (value as any) && typeof (value as any).toBase58 === 'function') {
      return String((value as any).toBase58())
    }
    if ('pubkey' in (value as any)) return toAddressText((value as any).pubkey)
  }
  return String(value)
}

export async function decodeGambaTransaction(rpc: any, signature: string) {
  const transaction = await rpc
    .getTransaction(signature as Address, {
      encoding: 'json',
      maxSupportedTransactionVersion: 0,
      commitment: 'confirmed',
    })
    .send()

  if (!transaction) throw new Error('Transaction not found')

  const accountKeys = (transaction.transaction?.message?.accountKeys ?? []).map((entry: any) => toAddressText(entry))

  const topLevel = (transaction.transaction?.message?.instructions ?? [])
    .map((instruction: any, index: number) => {
      const programAddress = toAddressText(accountKeys[instruction.programIdIndex])
      const accounts = (instruction.accounts ?? []).map((position: number) => toAddressText(accountKeys[position]))
      return decodeInstruction({
        signature,
        source: 'top-level',
        index,
        programAddress,
        accounts,
        dataBase58: instruction.data,
        stackHeight: instruction.stackHeight ?? null,
      })
    })
    .filter((instruction: DecodedGambaInstruction | null): instruction is DecodedGambaInstruction => !!instruction)

  const innerGroups = transaction.meta?.innerInstructions ?? []
  const inner = innerGroups
    .flatMap((group: any, groupIndex: number) => {
      return (group.instructions ?? []).map((instruction: any, index: number) => {
        const programAddress = toAddressText(accountKeys[instruction.programIdIndex])
        const accounts = (instruction.accounts ?? []).map((position: number) => toAddressText(accountKeys[position]))
        return decodeInstruction({
          signature,
          source: 'inner',
          index: groupIndex * 1000 + index,
          programAddress,
          accounts,
          dataBase58: instruction.data,
          stackHeight: instruction.stackHeight ?? null,
        })
      })
    })
    .filter((instruction: DecodedGambaInstruction | null): instruction is DecodedGambaInstruction => !!instruction)

  return {
    signature,
    slot: Number(transaction.slot ?? 0),
    blockTime: transaction.blockTime ? Number(transaction.blockTime) * 1000 : null,
    err: transaction.meta?.err ?? null,
    feeLamports: Number(transaction.meta?.fee ?? 0),
    logs: transaction.meta?.logMessages ?? [],
    instructions: [...topLevel, ...inner],
    transaction,
  }
}
