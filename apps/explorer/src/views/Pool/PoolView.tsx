import RecentPlays, { TimeDiff } from '@/RecentPlays'
import { PoolChangesResponse, apiFetcher, getApiUrl } from '@/api'
import { ConnectUserCard } from '@/components/ConnectUserCard'
import { DetailCard } from '@/components/index'
import { SolanaAddress } from '@/components/SolanaAddress'
import { TokenValue2 } from '@/components/TokenValue2'
import { NATIVE_MINT, SYSTEM_PROGRAM } from '@/constants'
import { useBalance, useTokenMeta, useWalletAddress } from '@/hooks'
import { bpsToPercentString } from '@/lib/format'
import { fetchPoolDetails } from '@/lib/pool'
import { PoolCharts } from '@/views/Pool/PoolCharts'
import { PoolDeposit } from '@/views/Pool/PoolDeposit'
import { PoolJackpotDeposit } from '@/views/Pool/PoolJackpotDeposit'
import { PoolMintBonus } from '@/views/Pool/PoolMintBonus'
import { PoolWithdraw } from '@/views/Pool/PoolWithdraw'
import { PlusIcon, RocketIcon } from '@radix-ui/react-icons'
import { useGambaRpc, useGambaState } from '@gamba/react'
import { useConnector } from '@solana/connector'
import { Badge, Box, Button, Card, Dialog, Flex, Grid, Link, Switch, Tabs, Text } from '@radix-ui/themes'
import { isAddress, type Address } from '@solana/kit'
import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import useSWR from 'swr'
import useSWRInfinite from 'swr/infinite'
import { PoolHeader } from './PoolHeader'

function PoolRecentPlays({ pool }: { pool: string }) {
  const [onlyJackpots, setOnlyJackpots] = React.useState(false)
  return (
    <>
      <Flex mb="4">
        <label>
          <Text mr="4" color="gray" size="2">
            Show Jackpots
          </Text>
          <Switch checked={onlyJackpots} onCheckedChange={setOnlyJackpots} size="1" radius="full" />
        </label>
      </Flex>
      <RecentPlays pool={pool} onlyJackpots={onlyJackpots} />
    </>
  )
}

function PoolDeposits({ poolAddress, tokenMint }: { poolAddress: string; tokenMint: string }) {
  const { data: poolChanges = [], isLoading } = useSWRInfinite(
    (index) => getApiUrl('/events/poolChanges', { pool: poolAddress, page: index, itemsPerPage: 10 }),
    async (endpoint) => apiFetcher<PoolChangesResponse>(endpoint),
  )

  return (
    <Card>
      <Grid gap="2">
        {isLoading && <Text color="gray">Loading deposits…</Text>}
        {poolChanges.flatMap(({ results }) =>
          results.map((change, i) => (
            <Card key={`${change.signature}-${i}`} size="1">
              <Flex justify="between" align="center">
                <Flex gap="2" align="center">
                  <SolanaAddress truncate address={change.user} />
                  <Badge color={change.action === 'deposit' ? 'green' : 'red'}>
                    {change.action === 'deposit' ? '+' : '-'}
                    <TokenValue2 exact mint={tokenMint} amount={change.amount} />
                  </Badge>
                </Flex>
                <Link target="_blank" href={`https://solscan.io/tx/${change.signature}`} rel="noreferrer noopener">
                  <TimeDiff time={change.time} />
                </Link>
              </Flex>
            </Card>
          )),
        )}
      </Grid>
    </Card>
  )
}

export default function PoolView() {
  const { poolId = '' } = useParams<{ poolId: string }>()
  const { rpc } = useGambaRpc()
  const { isConnected, connectors, connectWallet } = useConnector()
  const walletAddress = useWalletAddress()
  const navigate = useNavigate()

  const validAddress = isAddress(poolId)
  const { data: poolData, isLoading } = useSWR(validAddress ? `pool-${poolId}` : null, async () => fetchPoolDetails(rpc, poolId as Address))
  const gambaStateQuery = useGambaState()
  const gambaState = gambaStateQuery.data?.exists ? (gambaStateQuery.data.data as any) : null

  const tokenMintForHooks = poolData?.underlyingTokenMint ?? NATIVE_MINT
  const token = useTokenMeta(tokenMintForHooks)
  const balances = useBalance(tokenMintForHooks, poolData?.poolAuthority)

  if (!validAddress) return <Text color="red">Invalid pool address.</Text>
  if (isLoading || !poolData) return <Text color="gray">Loading pool…</Text>

  const poolFeeBps = poolData.state.customPoolFee ? poolData.state.customPoolFeeBps : gambaState?.defaultPoolFee ?? 0
  const gambaFeeBps = poolData.state.customGambaFee ? poolData.state.customGambaFeeBps : gambaState?.gambaFeeBps ?? 0
  const maxPayoutBps = poolData.state.customMaxPayout ? poolData.state.customMaxPayoutBps : gambaState?.maxPayoutBps ?? 0
  const jackpotPayoutPercentage = Number(gambaState?.jackpotPayoutToUserBps ?? 0) / 10_000

  const canConfigure = Boolean(walletAddress && (walletAddress === poolData.poolAuthority || walletAddress === String(gambaState?.authority ?? '')))

  return (
    <Flex direction="column" gap="4">
      <Flex justify={{ sm: 'between' }} align={{ sm: 'end' }} py="4" direction={{ initial: 'column', sm: 'row' }} gap="4">
        <PoolHeader pool={poolData} canConfigure={canConfigure} />
        <Flex align="center" gap="4" wrap="wrap">
          <Flex align="center" gap="4">
            <Dialog.Root>
              <Dialog.Trigger>
                <Button size="1" variant="ghost">
                  Bonus <PlusIcon />
                </Button>
              </Dialog.Trigger>
              <Dialog.Content>
                <PoolMintBonus pool={poolData} />
              </Dialog.Content>
            </Dialog.Root>

            <Dialog.Root>
              <Dialog.Trigger>
                <Button size="1" variant="ghost">
                  Jackpot <PlusIcon />
                </Button>
              </Dialog.Trigger>
              <Dialog.Content>
                <PoolJackpotDeposit pool={poolData} />
              </Dialog.Content>
            </Dialog.Root>
          </Flex>

          <Button onClick={() => navigate(`/pool/${poolId}/deposit`)} size="3">
            Add Liquidity <RocketIcon />
          </Button>
        </Flex>
      </Flex>

      <Grid gap="2" columns="1">
        <Flex gap="2" wrap="wrap">
          <DetailCard title="LP price">
            {poolData.ratio.toLocaleString(undefined, { maximumFractionDigits: 2 })} {token.symbol}
          </DetailCard>
          <DetailCard title="Liquidity">
            <TokenValue2 mint={poolData.underlyingTokenMint} amount={poolData.liquidity} compact={false} maximumFractionDigits={1} />
          </DetailCard>
          <DetailCard title="LP Token Supply">
            <TokenValue2 mint={poolData.underlyingTokenMint} amount={poolData.lpSupply} compact={false} maximumFractionDigits={1} />
          </DetailCard>
          <DetailCard title="Max Payout">
            {bpsToPercentString(maxPayoutBps)}
          </DetailCard>
          <DetailCard title="Circulating Bonus">
            <TokenValue2 mint={poolData.underlyingTokenMint} amount={poolData.bonusBalance} compact={false} maximumFractionDigits={2} />
          </DetailCard>
          <DetailCard title="Jackpot">
            <TokenValue2 mint={poolData.underlyingTokenMint} amount={Number(poolData.jackpotBalance) * jackpotPayoutPercentage} compact={false} maximumFractionDigits={2} />
          </DetailCard>
          <DetailCard title="Pool Fee">{bpsToPercentString(poolFeeBps)}</DetailCard>
          <DetailCard title="Gamba Fee">{bpsToPercentString(gambaFeeBps)}</DetailCard>
          <DetailCard title="Total Plays">{poolData.plays.toLocaleString(undefined)}</DetailCard>
          <DetailCard title="Visibility">{poolData.poolAuthority === SYSTEM_PROGRAM ? 'PUBLIC' : 'PRIVATE'}</DetailCard>
        </Flex>
      </Grid>

      <PoolCharts pool={poolData} />

      {balances.lpBalance > 0n ? (
        <Card size="3">
          <Grid gap="2">
            <Text color="gray">Your position</Text>
            <Text size="5" weight="bold">
              <TokenValue2 dollar mint={poolData.underlyingTokenMint} amount={Number(balances.lpBalance) * poolData.ratio} />
            </Text>
            <Text>
              <TokenValue2 exact mint={poolData.underlyingTokenMint} amount={balances.lpBalance} suffix="LP" />
            </Text>
            <PoolWithdraw pool={poolData} />
          </Grid>
        </Card>
      ) : isConnected ? (
        <Card size="3">
          <Grid gap="4" align="center" justify="center">
            <Text align="center" color="gray">
              No position in this pool yet.
            </Text>
            <Flex align="center" justify="center">
              <Dialog.Root>
                <Dialog.Trigger>
                  <Button size="3">Deposit</Button>
                </Dialog.Trigger>
                <Dialog.Content>
                  <PoolDeposit pool={poolData} />
                </Dialog.Content>
              </Dialog.Root>
            </Flex>
          </Grid>
        </Card>
      ) : (
        <ConnectUserCard
          onConnect={() => {
            const connector = connectors.find((c) => c.ready)
            if (connector) void connectWallet(connector.id)
          }}
        />
      )}

      <Tabs.Root defaultValue="plays">
        <Tabs.List>
          <Tabs.Trigger value="plays">Recent plays</Tabs.Trigger>
          <Tabs.Trigger value="deposits">Deposits</Tabs.Trigger>
        </Tabs.List>
        <Box pt="4">
          <Tabs.Content value="plays">
            <PoolRecentPlays pool={poolData.publicKey} />
          </Tabs.Content>
          <Tabs.Content value="deposits">
            <PoolDeposits poolAddress={poolData.publicKey} tokenMint={poolData.underlyingTokenMint} />
          </Tabs.Content>
        </Box>
      </Tabs.Root>
    </Flex>
  )
}
