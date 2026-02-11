import { TokenAvatar } from '@/components'
import { SkeletonText } from '@/components/Skeleton'
import { TableRowNavLink } from '@/components/TableRowLink'
import { TokenValue2 } from '@/components/TokenValue2'
import { SYSTEM_PROGRAM } from '@/constants'
import { useGetTokenMeta, useTokenMeta } from '@/hooks/useTokenMeta'
import { useGambaRpc } from '@gamba/react'
import { Avatar, Badge, Flex, Table, Text } from '@radix-ui/themes'
import React from 'react'
import styled from 'styled-components'
import useSWR from 'swr'
import { fetchPools, type UiPool } from '@/lib/pool'

const StyledTableCell = styled(Table.Cell)`
  vertical-align: middle;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
`

function PoolTableRow({ pool }: { pool: UiPool }) {
  const token = useTokenMeta(pool.underlyingTokenMint)

  return (
    <TableRowNavLink to={`/pool/${pool.publicKey}`}>
      <StyledTableCell>
        <Flex gap="4" align="center">
          <TokenAvatar mint={pool.underlyingTokenMint} size="2" />
          <Text>{token.name}</Text>
          <Text size="2" color="gray">
            {token.symbol}
          </Text>
          {pool.poolAuthority !== SYSTEM_PROGRAM ? (
            <Badge color="orange">PRIVATE</Badge>
          ) : (
            <Badge color="green">PUBLIC</Badge>
          )}
        </Flex>
      </StyledTableCell>
      <StyledTableCell>
        <Flex align="center">
          <TokenValue2 mint={pool.underlyingTokenMint} amount={pool.liquidity} />
        </Flex>
      </StyledTableCell>
      <StyledTableCell>
        <Flex align="center">
          <TokenValue2 dollar mint={pool.underlyingTokenMint} amount={pool.liquidity} />
        </Flex>
      </StyledTableCell>
      <StyledTableCell>
        {pool.ratio.toFixed(3)}
      </StyledTableCell>
    </TableRowNavLink>
  )
}

export function PoolList({ limit = Infinity }: { limit?: number }) {
  const { rpc } = useGambaRpc()
  const getTokenMeta = useGetTokenMeta()

  const { data: pools = [], isLoading: isLoadingPools } = useSWR(
    'pools-v3',
    async (): Promise<UiPool[]> => fetchPools(rpc),
    {
      refreshInterval: 45_000,
      refreshWhenHidden: false,
      refreshWhenOffline: false,
      revalidateOnFocus: false,
    },
  )

  const sortedPools = React.useMemo(() => {
    return [...pools].sort((a, b) => {
      const aMeta = getTokenMeta(a.underlyingTokenMint)
      const bMeta = getTokenMeta(b.underlyingTokenMint)
      const aTvl = Number(a.liquidity) * aMeta.usdPrice / 10 ** aMeta.decimals
      const bTvl = Number(b.liquidity) * bMeta.usdPrice / 10 ** bMeta.decimals
      const tvlDiff = bTvl - aTvl
      if (tvlDiff) return tvlDiff
      const playsDiff = b.plays - a.plays
      if (playsDiff) return playsDiff
      const liquidityDiff = b.liquidity - a.liquidity
      if (liquidityDiff) return liquidityDiff > 0n ? 1 : -1
      return a.publicKey > b.publicKey ? 1 : -1
    })
  }, [getTokenMeta, pools])

  return (
    <Table.Root variant="surface">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeaderCell>Pool</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Liquidity</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>TVL</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Ratio</Table.ColumnHeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {isLoadingPools ? (
          <>
            {Array.from({ length: 3 }).map((_, i) => (
              <Table.Row key={i}>
                <StyledTableCell>
                  <Flex gap="4" align="center">
                    <Avatar fallback="-" size="2" />
                    <SkeletonText style={{ width: '150px' }} />
                  </Flex>
                </StyledTableCell>
                {Array.from({ length: 4 }).map((_, cell) => (
                  <StyledTableCell key={cell}>
                    <SkeletonText />
                  </StyledTableCell>
                ))}
              </Table.Row>
            ))}
          </>
        ) : (
          <>
            {sortedPools.slice(0, limit).map((pool) => (
              <PoolTableRow key={pool.publicKey} pool={pool} />
            ))}
          </>
        )}
      </Table.Body>
    </Table.Root>
  )
}
