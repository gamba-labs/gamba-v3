import React from 'react'
import bs58 from 'bs58'
import { useConnector } from '@solana/connector'
import { instructions, multiplayer, pdas } from '@gamba/core'
import { useGambaRpc, useSendSmartTransaction } from '@gamba/react'
import { createSolanaRpcSubscriptions, type Address, type Instruction, isAddress } from '@solana/kit'
import { PLATFORM_CREATOR_ADDRESS, PLATFORM_CREATOR_FEE_BPS } from '../../config/constants'

export const NATIVE_MINT = 'So11111111111111111111111111111111111111112' as Address

export type MultiplayerGameAccount = {
  publicKey: Address
  account: multiplayer.Game
}

export type MultiplayerGameFilters = {
  winnersTarget?: number
  maxPlayers?: number
  mint?: Address
  creator?: Address
}

type CreateMultiplayerGameInput = {
  mint: Address
  maxPlayers: number
  preAllocPlayers?: number
  winnersTarget?: number
  wagerType: number
  payoutType?: number
  wager: number | bigint
  softDuration: number | bigint
  hardDuration?: number | bigint
  gameSeed?: number | bigint
  minBet: number | bigint
  maxBet: number | bigint
}

type JoinMultiplayerGameInput = {
  gameAccount: Address
  mint: Address
  wager: number | bigint
  creatorAddress?: Address
  creatorFeeBps?: number
  team?: number
  metadata?: string
}

type EditMultiplayerBetInput = {
  gameAccount: Address
  mint: Address
  wager: number | bigint
  creatorAddress?: Address
  creatorFeeBps?: number
  team?: number
  metadata?: string
}

type LeaveMultiplayerGameInput = {
  gameAccount: Address
  mint: Address
}

type MultiplayerState = {
  games: MultiplayerGameAccount[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

type MultiplayerGameState = {
  game: multiplayer.Game | null
  metadata: Record<string, string>
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

function asAddress(value: unknown): Address | null {
  const raw = String(value ?? '')
  return isAddress(raw) ? (raw as Address) : null
}

function toU64(value: number | bigint): bigint {
  if (typeof value === 'bigint') return value >= 0n ? value : 0n
  if (!Number.isFinite(value)) return 0n
  return BigInt(Math.max(0, Math.round(value)))
}

function toI64Seconds(value: number | bigint): bigint {
  if (typeof value === 'bigint') return value
  if (!Number.isFinite(value)) return 0n
  return BigInt(Math.round(value))
}

function defaultHardDuration(softDuration: number | bigint): number | bigint {
  return typeof softDuration === 'bigint' ? softDuration * 2n : softDuration * 2
}

function decodeFixedUtf8(bytes: Readonly<Uint8Array>): string {
  let end = bytes.length
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0) {
      end = i
      break
    }
  }
  if (end === 0) return ''
  return new TextDecoder().decode(bytes.slice(0, end)).trim()
}

function encodeFixedUtf8(text: string, size = 32): Uint8Array {
  const out = new Uint8Array(size)
  const encoded = new TextEncoder().encode(text)
  out.set(encoded.slice(0, size))
  return out
}

async function fetchAllGames(rpc: any): Promise<MultiplayerGameAccount[]> {
  const discriminator = bs58.encode(new Uint8Array(multiplayer.getGameDiscriminatorBytes()))

  const accounts = await rpc
    .getProgramAccounts(multiplayer.MULTIPLAYER_PROGRAM_ADDRESS, {
      filters: [{ memcmp: { offset: 0n, bytes: discriminator as any, encoding: 'base58' } }],
      encoding: 'base64',
    })
    .send()

  const out: MultiplayerGameAccount[] = []

  for (const account of accounts as any[]) {
    try {
      const address = asAddress(account?.pubkey)
      if (!address) continue

      const data = account?.account?.data
      if (!Array.isArray(data) || typeof data[0] !== 'string') continue
      const bytes = base64ToBytes(data[0])
      const decoded = multiplayer.getGameDecoder().decode(bytes)

      out.push({
        publicKey: address,
        account: decoded,
      })
    } catch {
      // Skip malformed program accounts.
    }
  }

  out.sort((a, b) => {
    const aa = a.account.creationTimestamp
    const bb = b.account.creationTimestamp
    if (aa === bb) return 0
    return aa > bb ? -1 : 1
  })

  return out
}

function matchesFilters(game: MultiplayerGameAccount, filters: MultiplayerGameFilters) {
  if (filters.winnersTarget != null && Number(game.account.winnersTarget) !== Number(filters.winnersTarget)) return false
  if (filters.maxPlayers != null && Number(game.account.maxPlayers) !== Number(filters.maxPlayers)) return false
  if (filters.mint != null && String(game.account.mint) !== String(filters.mint)) return false
  if (filters.creator != null && String(game.account.gameMaker) !== String(filters.creator)) return false
  return true
}

async function fetchGameMetadata(rpc: any, gameAddress: Address): Promise<Record<string, string>> {
  const metadataAddress = await pdas.deriveMultiplayerMetadataPda(gameAddress)
  const maybeMetadata = await multiplayer.fetchMaybePlayerMetadataAccount(rpc, metadataAddress)

  if (!maybeMetadata.exists || !maybeMetadata.data) return {}

  const out: Record<string, string> = {}

  for (const entry of maybeMetadata.data.entries) {
    const player = String(entry.player)
    const name = decodeFixedUtf8(entry.meta)
    if (name) {
      out[player] = name
    }
  }

  return out
}

export function usePlinkoRaceGames(filters: MultiplayerGameFilters, pollMs = 5000): MultiplayerState {
  const { rpc } = useGambaRpc()
  const [games, setGames] = React.useState<MultiplayerGameAccount[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const normalizedFilters = React.useMemo<MultiplayerGameFilters>(
    () => ({
      winnersTarget: filters.winnersTarget,
      maxPlayers: filters.maxPlayers,
      mint: filters.mint,
      creator: filters.creator,
    }),
    [filters.creator, filters.maxPlayers, filters.mint, filters.winnersTarget],
  )

  const refresh = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const allGames = await fetchAllGames(rpc)
      setGames(allGames.filter((entry) => matchesFilters(entry, normalizedFilters)))
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch multiplayer games')
    } finally {
      setLoading(false)
    }
  }, [normalizedFilters, rpc])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  React.useEffect(() => {
    if (!pollMs || pollMs <= 0) return
    const id = window.setInterval(() => {
      void refresh()
    }, pollMs)
    return () => window.clearInterval(id)
  }, [pollMs, refresh])

  return {
    games,
    loading,
    error,
    refresh,
  }
}

export function usePlinkoRaceGame(gameAddress: Address | null): MultiplayerGameState {
  const { rpc, wsUrl } = useGambaRpc()
  const [game, setGame] = React.useState<multiplayer.Game | null>(null)
  const [metadata, setMetadata] = React.useState<Record<string, string>>({})
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const refresh = React.useCallback(async () => {
    if (!gameAddress) {
      setGame(null)
      setMetadata({})
      setLoading(false)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const [maybeGame, decodedMetadata] = await Promise.all([
        multiplayer.fetchMaybeGame(rpc, gameAddress),
        fetchGameMetadata(rpc, gameAddress),
      ])

      setGame(maybeGame.exists ? maybeGame.data : null)
      setMetadata(decodedMetadata)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to fetch multiplayer game')
      setGame(null)
      setMetadata({})
    } finally {
      setLoading(false)
    }
  }, [gameAddress, rpc])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  React.useEffect(() => {
    if (!gameAddress) return

    const rpcSubs = createSolanaRpcSubscriptions(wsUrl)
    const abortController = new AbortController()
    let closed = false

    ;(async () => {
      try {
        const gameNotifications = await rpcSubs
          .accountNotifications(gameAddress, {
            commitment: 'confirmed',
            encoding: 'base64',
          })
          .subscribe({ abortSignal: abortController.signal })

        for await (const notification of gameNotifications) {
          if (closed) break
          try {
            const data = (notification.value as any)?.data
            if (!Array.isArray(data) || typeof data[0] !== 'string') continue
            const bytes = base64ToBytes(data[0])
            const decoded = multiplayer.getGameDecoder().decode(bytes)
            setGame(decoded)
          } catch {
            // Ignore malformed updates.
          }
        }
      } catch {
        // Subscription ended.
      }
    })()

    ;(async () => {
      try {
        const metadataAddress = await pdas.deriveMultiplayerMetadataPda(gameAddress)
        const metadataNotifications = await rpcSubs
          .accountNotifications(metadataAddress, {
            commitment: 'confirmed',
            encoding: 'base64',
          })
          .subscribe({ abortSignal: abortController.signal })

        for await (const _notification of metadataNotifications) {
          if (closed) break
          try {
            const nextMetadata = await fetchGameMetadata(rpc, gameAddress)
            setMetadata(nextMetadata)
          } catch {
            // Ignore malformed updates.
          }
        }
      } catch {
        // Subscription ended.
      }
    })()

    return () => {
      closed = true
      abortController.abort()
    }
  }, [gameAddress, rpc, wsUrl])

  return {
    game,
    metadata,
    loading,
    error,
    refresh,
  }
}

export function usePlinkoRaceActions() {
  const { isConnected } = useConnector()
  const { send, signer, ready } = useSendSmartTransaction()

  const assertSigner = React.useCallback(() => {
    if (!isConnected || !ready || !signer) {
      throw new Error('Wallet not connected')
    }
    return signer
  }, [isConnected, ready, signer])

  const createGame = React.useCallback(async (input: CreateMultiplayerGameInput) => {
    const walletSigner = assertSigner()

    const resolvedMint = input.mint as Address
    const ix = String(resolvedMint) === String(NATIVE_MINT)
      ? await instructions.multiplayer.buildCreateGameNativeInstruction({
          user: walletSigner,
          gameSeed: input.gameSeed,
          maxPlayers: input.maxPlayers,
          preAllocPlayers: input.preAllocPlayers,
          winnersTarget: input.winnersTarget ?? 1,
          wagerType: input.wagerType,
          payoutType: input.payoutType ?? 0,
          wager: toU64(input.wager),
          softDuration: toI64Seconds(input.softDuration),
          hardDuration: toI64Seconds(input.hardDuration ?? defaultHardDuration(input.softDuration)),
          minBet: toU64(input.minBet),
          maxBet: toU64(input.maxBet),
        })
      : await instructions.multiplayer.buildCreateGameSplInstruction({
          user: walletSigner,
          mint: resolvedMint,
          gameSeed: input.gameSeed,
          maxPlayers: input.maxPlayers,
          preAllocPlayers: input.preAllocPlayers,
          winnersTarget: input.winnersTarget ?? 1,
          wagerType: input.wagerType,
          payoutType: input.payoutType ?? 0,
          wager: toU64(input.wager),
          softDuration: toI64Seconds(input.softDuration),
          hardDuration: toI64Seconds(input.hardDuration ?? defaultHardDuration(input.softDuration)),
          minBet: toU64(input.minBet),
          maxBet: toU64(input.maxBet),
        })

    return send([ix as unknown as Instruction<Address>])
  }, [assertSigner, send])

  const joinGame = React.useCallback(async (input: JoinMultiplayerGameInput) => {
    const walletSigner = assertSigner()

    const ix = await instructions.multiplayer.buildJoinGameInstruction({
      user: walletSigner,
      gameAccount: input.gameAccount,
      mint: input.mint,
      creatorAddress: input.creatorAddress ?? (PLATFORM_CREATOR_ADDRESS as Address),
      creatorFeeBps: input.creatorFeeBps ?? PLATFORM_CREATOR_FEE_BPS,
      wager: toU64(input.wager),
      team: input.team ?? 0,
      playerMeta: encodeFixedUtf8((input.metadata ?? '').trim(), 32),
    })

    return send([ix as unknown as Instruction<Address>])
  }, [assertSigner, send])

  const editBet = React.useCallback(async (input: EditMultiplayerBetInput) => {
    const walletSigner = assertSigner()

    const ixs = await instructions.multiplayer.buildEditBetInstructions({
      user: walletSigner,
      gameAccount: input.gameAccount,
      mint: input.mint,
      creatorAddress: input.creatorAddress ?? (PLATFORM_CREATOR_ADDRESS as Address),
      creatorFeeBps: input.creatorFeeBps ?? PLATFORM_CREATOR_FEE_BPS,
      wager: toU64(input.wager),
      team: input.team ?? 0,
      playerMeta: encodeFixedUtf8((input.metadata ?? '').trim(), 32),
    })

    return send(ixs as unknown as Instruction<Address>[])
  }, [assertSigner, send])

  const leaveGame = React.useCallback(async (input: LeaveMultiplayerGameInput) => {
    const walletSigner = assertSigner()

    const ix = await instructions.multiplayer.buildLeaveGameInstruction({
      user: walletSigner,
      gameAccount: input.gameAccount,
      mint: input.mint,
    })

    return send([ix as unknown as Instruction<Address>])
  }, [assertSigner, send])

  return {
    createGame,
    joinGame,
    editBet,
    leaveGame,
    ready: isConnected && ready && Boolean(signer),
  }
}
