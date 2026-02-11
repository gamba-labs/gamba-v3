import { ConnectUserCard } from '@/components/ConnectUserCard'
import { Spinner } from '@/components/Spinner'
import { TokenValue2 } from '@/components/TokenValue2'
import { useTokenList, useTokenMeta } from '@/hooks'
import { fetchPools, type UiPool } from '@/lib/pool'
import { pdas } from '@gamba/core'
import { useGambaRpc } from '@gamba/react'
import { ArrowRightIcon } from '@radix-ui/react-icons'
import { Avatar, Button, Card, Flex, Grid, Heading, Text } from '@radix-ui/themes'
import { useConnector } from '@solana/connector'
import type { Address } from '@solana/kit'
import React from 'react'
import { useNavigate } from 'react-router-dom'
import useSWR from 'swr'

interface Position {
  pool: UiPool
  lpBalance: bigint
}

function PortfolioItem({ position }: { position: Position }) {
  const navigate = useNavigate()
  const { pool, lpBalance } = position
  const token = useTokenMeta(pool.underlyingTokenMint)

  return (
    <Card key={pool.publicKey}>
      <Flex justify="between" align="center">
        <Flex align="center" gap="2">
          <Avatar radius="full" fallback="?" size="3" color="green" src={token?.image || ''} />
          <Flex direction="column">
            <Text>{token.name}</Text>
            <Text>
              <TokenValue2 mint={pool.underlyingTokenMint} amount={Number(lpBalance) * pool.ratio} /> {' - '}
              <TokenValue2 dollar mint={pool.underlyingTokenMint} amount={Number(lpBalance) * pool.ratio} />
            </Text>
          </Flex>
        </Flex>
        <Button onClick={() => navigate(`/pool/${pool.publicKey}`)} variant="soft">
          View <ArrowRightIcon />
        </Button>
      </Flex>
    </Card>
  )
}

function Inner() {
  const { rpc } = useGambaRpc()
  const { tokens } = useTokenList()

  const { data: pools = [], isLoading: isLoadingPools } = useSWR('portfolio-pools', () => fetchPools(rpc))

  const [lpMintByPool, setLpMintByPool] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    let cancelled = false

    ;(async () => {
      const pairs = await Promise.all(
        pools.map(async (pool) => {
          const lpMint = await pdas.derivePoolLpMintPda(pool.publicKey as Address)
          return [pool.publicKey, String(lpMint)] as const
        }),
      )

      if (!cancelled) {
        setLpMintByPool(Object.fromEntries(pairs))
      }
    })()

    return () => {
      cancelled = true
    }
  }, [pools])

  const positions = React.useMemo(() => {
    return pools
      .map((pool) => {
        const lpMint = lpMintByPool[pool.publicKey]
        if (!lpMint) return null
        const lpAccount = tokens.find((token) => token.mint === lpMint)
        const lpBalance = lpAccount?.amount ?? 0n
        return { pool, lpBalance }
      })
      .filter((position): position is Position => !!position && position.lpBalance > 0n)
      .sort((a, b) => (a.lpBalance > b.lpBalance ? -1 : 1))
  }, [lpMintByPool, pools, tokens])

  return (
    <Card size="3">
      <Grid gap="4">
        <Heading>Portfolio</Heading>
        {isLoadingPools && (
          <Flex align="center" justify="center" p="4">
            <Spinner />
          </Flex>
        )}
        {!isLoadingPools && positions.length === 0 && <Text color="gray">No LP positions found.</Text>}
        <Grid gap="2">
          {positions.map((position) => (
            <PortfolioItem key={position.pool.publicKey} position={position} />
          ))}
        </Grid>
      </Grid>
    </Card>
  )
}

export default function PortfolioView() {
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
