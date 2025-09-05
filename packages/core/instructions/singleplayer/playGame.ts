import { core, pdas } from '../../src'
import type { Address } from '@solana/kit'

type BuildPlayGameIxParams = {
  user: any
  pool: Address
  underlyingTokenMint?: Address
  userUnderlyingAta?: Address
  creator?: Address
  creatorFeeBps?: number
  jackpotFeeBps?: number
  wager: number | bigint
  bet: number[]
  clientSeed?: string
  metadata?: string
  // Optional: auto include bonus if wallet has balance
  autoIncludeBonus?: boolean
  // Optional: RPC helper for balance detection (expects Solana-kit-like shape)
  rpc?: any
  // Optional precomputed accounts for flexibility
  player?: Address
  game?: Address
  creatorAta?: Address
  playerAta?: Address
  playerBonusAta?: Address
  userBonusAta?: Address
}

export async function buildPlayGameInstruction(params: BuildPlayGameIxParams) {
  const {
    user,
    pool,
    underlyingTokenMint,
    userUnderlyingAta,
    creatorFeeBps = 0,
    jackpotFeeBps = 0,
    wager,
    bet,
    clientSeed,
    metadata,
    autoIncludeBonus = true,
    rpc,
  } = params

  const player = params.player ?? (await pdas.derivePlayerPda(user.address as Address))
  const game = params.game ?? (await pdas.deriveGamePda(user.address as Address))
  const gambaState = await pdas.deriveGambaStatePda()
  const poolJackpotTokenAccount = await pdas.derivePoolJackpotTokenAccountPda(pool)

  const creator = params.creator ?? (user.address as Address)
  // Resolve underlying from pool if not provided (via codama helper)
  let resolvedUnderlying = underlyingTokenMint
  let poolData: any = null
  if (!resolvedUnderlying || (autoIncludeBonus && rpc)) {
    if (!rpc) throw new Error('rpc required to resolve pool data')
    const poolAccount = await core.fetchPool(rpc, pool)
    poolData = poolAccount.data as any
    if (!resolvedUnderlying) {
      resolvedUnderlying = poolData.underlyingTokenMint as Address
    }
  }

  const creatorAta = params.creatorAta ?? (await pdas.deriveAta(creator, resolvedUnderlying as Address))
  const playerAta = params.playerAta ?? (await pdas.deriveAta(player, resolvedUnderlying as Address))

  // Bonus handling
  let bonusTokenMint: Address | undefined
  let userBonusAta: Address | undefined = params.userBonusAta
  let playerBonusAta: Address | undefined = params.playerBonusAta

  // Resolve bonus mint: prefer custom from pool if present else default PDA
  if (poolData) {
    if (poolData.customBonusToken) {
      bonusTokenMint = poolData.customBonusTokenMint as Address
    } else {
      bonusTokenMint = await pdas.derivePoolBonusMintPda(pool)
    }
  } else {
    try {
      bonusTokenMint = await pdas.derivePoolBonusMintPda(pool)
    } catch (e) {
      // ignore
    }
  }

  if (autoIncludeBonus && bonusTokenMint) {
    const derivedUserBonusAta = userBonusAta ?? (await pdas.deriveAta(user.address as Address, bonusTokenMint))
    let include = false
    if (rpc) {
      try {
        const res = await rpc.getTokenAccountBalance(derivedUserBonusAta).send()
        const amount = BigInt(res?.value?.amount ?? '0')
        include = amount > 0n
      } catch {
        include = false
      }
    }
    if (include) {
      userBonusAta = derivedUserBonusAta
      playerBonusAta = playerBonusAta ?? (await pdas.deriveAta(player, bonusTokenMint))
    }
  }

  const ix = core.getPlayGameInstruction({
    user,
    player,
    game,
    pool,
    underlyingTokenMint: resolvedUnderlying as Address,
    bonusTokenMint: bonusTokenMint as Address,
    userUnderlyingAta: (userUnderlyingAta ?? (await pdas.deriveAta(user.address as Address, resolvedUnderlying as Address))) as Address,
    creator,
    creatorAta,
    playerAta,
    // Optional bonus accounts only when present
    ...(userBonusAta ? { userBonusAta } : {}),
    ...(playerBonusAta ? { playerBonusAta } : {}),
    gambaState,
    poolJackpotTokenAccount,
    associatedTokenProgram: pdas.ASSOCIATED_TOKEN_PROGRAM_ID,
    tokenProgram: pdas.TOKEN_PROGRAM_ID,
    systemProgram: pdas.SYSTEM_PROGRAM_ID,
    wager,
    bet,
    clientSeed: (clientSeed ?? 'seed'),
    creatorFeeBps,
    jackpotFeeBps,
    metadata: (metadata ?? '{}'),
  })

  return ix
}


