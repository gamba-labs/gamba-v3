import { ConnectUserCard } from '@/components/ConnectUserCard'
import { TokenItem } from '@/components/index'
import { PlayerAccountItem } from '@/components/AccountItem'
import { Details } from '@/components/Details'
import { SolanaAddress } from '@/components/SolanaAddress'
import { useTokenAccountsByOwner, useToast, useWalletAddress } from '@/hooks'
import { getExplorerTxUrl } from '@/lib/solana'
import { core, instructions, pdas } from '@gamba/core'
import { useGambaRpc, useGameByUser, usePlayerByUser, useSendSmartTransaction } from '@gamba/react'
import { useConnector } from '@solana/connector'
import { Button, Card, Flex, Grid, Heading, Link, Text } from '@radix-ui/themes'
import type { Address } from '@solana/kit'
import React from 'react'

function Inner() {
  const user = useWalletAddress() as Address
  const playerQuery = usePlayerByUser({ user })
  const gameQuery = useGameByUser({ user })
  const { send, ready, signer } = useSendSmartTransaction()
  const { rpcUrl } = useGambaRpc()
  const toast = useToast()

  const playerAddress = playerQuery.data?.address ?? null
  const gameAddress = gameQuery.data?.address ?? null

  const tokenAccounts = useTokenAccountsByOwner(playerAddress ?? undefined)

  const [initializing, setInitializing] = React.useState(false)
  const [closing, setClosing] = React.useState(false)

  const initialize = async () => {
    if (!ready || !signer) throw new Error('Wallet not connected')
    setInitializing(true)
    try {
      const ix = await instructions.singleplayer.buildPlayerInitializeInstruction({ user: signer as any })
      const signature = await send([ix as any])
      toast({ title: 'Player initialized', description: signature, link: getExplorerTxUrl(signature, rpcUrl) })
      await Promise.all([playerQuery.refetch(), gameQuery.refetch()])
    } finally {
      setInitializing(false)
    }
  }

  const close = async () => {
    if (!ready || !signer) throw new Error('Wallet not connected')
    setClosing(true)
    try {
      const ix = await instructions.singleplayer.buildPlayerCloseInstruction({ user: signer as any })
      const signature = await send([ix as any])
      toast({ title: 'Player closed', description: signature, link: getExplorerTxUrl(signature, rpcUrl) })
      await Promise.all([playerQuery.refetch(), gameQuery.refetch()])
    } finally {
      setClosing(false)
    }
  }

  const claim = async (underlyingTokenMint: string, playerAta: string) => {
    if (!ready || !signer) throw new Error('Wallet not connected')

    const [player, game, userUnderlyingAta] = await Promise.all([
      pdas.derivePlayerPda(user),
      pdas.deriveGamePda(user),
      pdas.deriveAta(user, underlyingTokenMint as Address),
    ])

    const ix = await core.getPlayerClaimInstructionAsync({
      user: signer as any,
      underlyingTokenMint: underlyingTokenMint as Address,
      player,
      game,
      playerAta: playerAta as Address,
      userUnderlyingAta,
      associatedTokenProgram: pdas.ASSOCIATED_TOKEN_PROGRAM_ID,
    })

    const signature = await send([ix as any])
    toast({ title: 'Claim sent', description: signature, link: getExplorerTxUrl(signature, rpcUrl) })

    await tokenAccounts.refetch()
    await Promise.all([playerQuery.refetch(), gameQuery.refetch()])
  }

  const isClaimable = tokenAccounts.accounts.some((token) => token.amount > 0n)

  return (
    <Flex direction="column" gap="4">
      <Details
        title={<PlayerAccountItem address={user} />}
        rows={[
          ['Wallet address', <SolanaAddress address={user} />],
          ['Player address', playerAddress ? <SolanaAddress address={playerAddress} /> : <Text color="gray">Not initialized</Text>],
          ['Game address', gameAddress ? <SolanaAddress address={gameAddress} /> : <Text color="gray">Not initialized</Text>],
        ]}
      />

      <Card>
        <Grid gap="4">
          {tokenAccounts.accounts.length > 0 && (
            <>
              <Text color="gray" size="2">
                If you are stuck in a bet, claim these balances back to your wallet.
              </Text>
              <Text color="red" size="2">
                Report any persistent issues in <Link target="_blank" rel="noreferrer noopener" href="https://discord.gg/xjBsW3e8fK">Discord</Link>.
              </Text>
              <Grid gap="2">
                {tokenAccounts.accounts.map((token) => (
                  <Card key={token.mint}>
                    <TokenItem
                      mint={token.mint}
                      balance={Number(token.amount)}
                      stuff={
                        <Button
                          disabled={token.amount === 0n || !token.ata}
                          size="2"
                          variant="soft"
                          onClick={() => {
                            if (!token.ata) return
                            void claim(token.mint, token.ata)
                          }}
                        >
                          Claim
                        </Button>
                      }
                    />
                  </Card>
                ))}
              </Grid>
            </>
          )}

          <Grid gap="4">
            {!playerQuery.data?.exists ? (
              <Button disabled={initializing} size="3" variant="soft" color="green" onClick={initialize}>
                {initializing ? 'Initializing…' : 'Initialize'}
              </Button>
            ) : (
              <>
                <Button size="3" variant="soft" color="red" onClick={close} disabled={closing || isClaimable}>
                  {closing ? 'Closing…' : 'Close account'}
                </Button>
                {isClaimable && (
                  <Text size="2" color="gray">
                    Claim all tokens before closing your account.
                  </Text>
                )}
              </>
            )}
          </Grid>
        </Grid>
      </Card>

      <Card>
        <Heading size="4">Player JSON</Heading>
        <pre>{JSON.stringify(playerQuery.data?.exists ? playerQuery.data.data : null, null, 2)}</pre>
      </Card>

      <Card>
        <Heading size="4">Game JSON</Heading>
        <pre>{JSON.stringify(gameQuery.data?.exists ? gameQuery.data.data : null, null, 2)}</pre>
      </Card>
    </Flex>
  )
}

export default function DebugUserView() {
  const { isConnected, connectors, connectWallet } = useConnector()

  if (!isConnected) {
    return (
      <ConnectUserCard
        onConnect={() => {
          const connector = connectors.find((c) => c.ready)
          if (connector) void connectWallet(connector.id)
        }}
      />
    )
  }

  return <Inner />
}
