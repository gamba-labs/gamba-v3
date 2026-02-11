import { ConnectUserCard } from '@/components/ConnectUserCard'
import { fetchPoolDetails } from '@/lib/pool'
import { PoolHeader } from '@/views/Pool/PoolHeader'
import { PoolDeposit } from '@/views/Pool/PoolDeposit'
import { useGambaRpc } from '@gamba/react'
import { useConnector } from '@solana/connector'
import { isAddress, type Address } from '@solana/kit'
import { Card, Flex, Grid, Text } from '@radix-ui/themes'
import React from 'react'
import { useParams } from 'react-router-dom'
import useSWR from 'swr'

export default function PoolDepositView() {
  const { poolId = '' } = useParams<{ poolId: string }>()
  const { rpc } = useGambaRpc()
  const { isConnected, connectors, connectWallet } = useConnector()

  const validAddress = isAddress(poolId)
  const { data: pool } = useSWR(validAddress ? `pool-deposit-${poolId}` : null, async () => fetchPoolDetails(rpc, poolId as Address))

  if (!validAddress) return <Text color="red">Invalid pool address</Text>
  if (!pool) return <Text color="gray">Loading pool…</Text>

  return (
    <Grid gap="4">
      <Flex justify="between" align="end" py="4">
        <PoolHeader pool={pool} />
      </Flex>
      {isConnected ? (
        <Card size="3">
          <PoolDeposit pool={pool} />
        </Card>
      ) : (
        <ConnectUserCard
          onConnect={() => {
            const connector = connectors.find((c) => c.ready)
            if (connector) void connectWallet(connector.id)
          }}
        />
      )}
    </Grid>
  )
}
