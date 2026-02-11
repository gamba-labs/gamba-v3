import { PlatformAccountItem, PlayerAccountItem } from '@/components/AccountItem'
import { Spinner } from '@/components/Spinner'
import { TokenValue2 } from '@/components/TokenValue2'
import { core } from '@gamba/core'
import { useGambaRpc } from '@gamba/react'
import { Button, Card, Flex, Grid, Heading, Text } from '@radix-ui/themes'
import bs58 from 'bs58'
import React from 'react'
import { NavLink } from 'react-router-dom'
import useSWR from 'swr'

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export default function AllUsers() {
  const { rpc } = useGambaRpc()
  const [page, setPage] = React.useState(0)

  const { data: games = [], isLoading, isValidating, mutate } = useSWR('all-games', async () => {
    const discriminator = core.getGameDiscriminatorBytes()
    const discB58 = bs58.encode(new Uint8Array(discriminator))

    const accounts: any[] = await rpc
      .getProgramAccounts(core.GAMBA_PROGRAM_ADDRESS, {
        filters: [{ memcmp: { offset: 0n, bytes: discB58 as any, encoding: 'base58' } }],
        encoding: 'base64',
      })
      .send()

    return accounts.map((account) => {
      const [b64] = account.account.data as [string, string]
      const bytes = base64ToBytes(b64)
      const game = core.getGameDecoder().decode(bytes) as any
      return {
        address: String(account.pubkey),
        data: game,
      }
    })
  })

  const sorted = React.useMemo(() => {
    return [...games].sort((a, b) => {
      const aStatus = Number(a.data.status ?? 0)
      const bStatus = Number(b.data.status ?? 0)
      if (aStatus !== bStatus) return bStatus - aStatus
      return String(a.address) > String(b.address) ? 1 : -1
    })
  }, [games])

  const pages = Array.from({ length: Math.max(1, Math.ceil(sorted.length / 25)) }).map((_, i) => i)
  const sliced = React.useMemo(() => sorted.slice(page * 25, page * 25 + 25), [sorted, page])

  return (
    <Card size="3">
      <Grid gap="4">
        <Flex justify="between">
          <Heading>Active game accounts</Heading>
          <Button variant="soft" disabled={isLoading || isValidating} onClick={() => mutate()}>
            Refresh
          </Button>
        </Flex>

        {(isLoading || isValidating) && (
          <Flex align="center" justify="center" p="4">
            <Spinner />
          </Flex>
        )}

        <Grid gap="2">
          {sliced.map((game) => (
            <Card size="1" key={game.address}>
              <Flex gap="2" wrap="wrap">
                <NavLink to={`/player/${String(game.data.user)}`}>
                  <PlayerAccountItem address={String(game.data.user)} />
                </NavLink>
                <Text> wagered </Text>
                <TokenValue2 mint={String(game.data.tokenMint)} amount={game.data.wager} />
                <Text> on </Text>
                <NavLink to={`/platform/${String(game.data.creator)}`}>
                  <PlatformAccountItem address={String(game.data.creator)} />
                </NavLink>
                <Text color="gray">nonce {String(game.data.nonce)}</Text>
                <Text color={Number(game.data.status) === 3 ? 'orange' : 'gray'}>
                  {Number(game.data.status) === 3 ? 'result-requested' : Number(game.data.status) === 2 ? 'ready' : 'idle'}
                </Text>
              </Flex>
            </Card>
          ))}
        </Grid>

        <Flex wrap="wrap" gap="2">
          {pages.map((value) => (
            <Button size="1" variant={value === page ? 'solid' : 'soft'} key={value} onClick={() => setPage(value)}>
              {value + 1}
            </Button>
          ))}
        </Flex>
      </Grid>
    </Card>
  )
}
