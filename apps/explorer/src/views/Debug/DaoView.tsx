import { DailyVolume, useApi } from '@/api'
import { LineChart, type LineChartDataPoint } from '@/charts/LineChart'
import { DetailCard, TokenItem } from '@/components'
import { SkeletonBarChart } from '@/components/Skeleton'
import { SolanaAddress } from '@/components/SolanaAddress'
import { TokenValue2 } from '@/components/TokenValue2'
import { NATIVE_MINT } from '@/constants'
import { useGetTokenMeta, useNativeBalance, useTokenAccountsByOwner, useToast, useWalletAddress } from '@/hooks'
import { bpsToPercentString } from '@/lib/format'
import { getExplorerTxUrl } from '@/lib/solana'
import { core, pdas } from '@gamba/core'
import { useGambaRpc, useGambaState, useSendSmartTransaction } from '@gamba/react'
import { GearIcon } from '@radix-ui/react-icons'
import { Button, Card, Dialog, Flex, Grid, Text, TextField } from '@radix-ui/themes'
import type { Address } from '@solana/kit'
import React from 'react'

function ButtonWithDialog(props: React.PropsWithChildren<{ label: React.ReactNode }>) {
  return (
    <Dialog.Root>
      <Dialog.Trigger>
        <Button size="3" variant="soft">
          {props.label}
        </Button>
      </Dialog.Trigger>
      <Dialog.Content>{props.children}</Dialog.Content>
    </Dialog.Root>
  )
}

const DAY_MS = 24 * 60 * 60 * 1000

function parseChartDate(date: string): number {
  let normalized = date.includes(' ') ? date.replace(' ', 'T') : date

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    normalized = `${normalized}T00:00:00`
  } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(normalized)) {
    normalized = `${normalized}:00`
  }

  const hasTimezone = /(?:Z|[+\-]\d{2}:\d{2})$/.test(normalized)
  const parsed = Date.parse(hasTimezone ? normalized : `${normalized}Z`)
  if (!Number.isNaN(parsed)) return parsed

  const fallback = Date.parse(date)
  return Number.isNaN(fallback) ? 0 : fallback
}

function formatUsd(value: number, maximumFractionDigits = 1) {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits })}`
}

function TotalVolume() {
  const { data: daily = [], isLoading } = useApi<DailyVolume[]>('/chart/dao-usd')
  const [hovered, setHovered] = React.useState<LineChartDataPoint | null>(null)

  const normalized = React.useMemo(() => {
    return daily
      .map((item) => ({ value: item.total_volume, date: item.date, timestamp: parseChartDate(item.date) }))
      .filter((item) => Number.isFinite(item.timestamp) && item.timestamp > 0)
      .sort((a, b) => a.timestamp - b.timestamp)
  }, [daily])

  const now = Date.now()

  const feesLast24h = React.useMemo(() => {
    const inWindow = normalized.filter((point) => point.timestamp > now - DAY_MS && point.timestamp <= now)
    const sum = inWindow.reduce((total, point) => total + point.value, 0)
    if (inWindow.length) return sum
    return normalized.at(-1)?.value ?? 0
  }, [normalized, now])

  const sevenDaySeries = React.useMemo(
    () => normalized.filter((point) => point.timestamp > now - 7 * DAY_MS && point.timestamp <= now),
    [normalized, now],
  )

  const fees7dAverage = React.useMemo(() => {
    if (!sevenDaySeries.length) return 0
    const total = sevenDaySeries.reduce((sum, point) => sum + point.value, 0)
    return total / sevenDaySeries.length
  }, [sevenDaySeries])

  const chartData = React.useMemo<LineChartDataPoint[]>(
    () => normalized.map((point) => ({ date: point.date, value: point.value })),
    [normalized],
  )

  const sevenDayWindowLabel = React.useMemo(() => {
    if (!sevenDaySeries.length) return 'No recent data'
    const from = new Date(sevenDaySeries[0].timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    const to = new Date(sevenDaySeries[sevenDaySeries.length - 1].timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    return `${from} - ${to}`
  }, [sevenDaySeries])

  return (
    <Card size="2">
      <Flex direction="column" gap="2">
        <Flex justify="between" align="end">
          <Flex direction="column" gap="1">
            <Text color="gray" size="2">
              DAO Fees
            </Text>
            <Text size="7" weight="bold">
              {formatUsd(hovered?.value ?? fees7dAverage)}
            </Text>
            <Text color="gray" size="1">
              {hovered?.date
                ? new Date(hovered.date).toLocaleString(undefined, {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : '7-day average per day'}
            </Text>
          </Flex>
        </Flex>

        <Flex wrap="wrap" gap="2" align="center">
          <Text size="2" color="gray">
            24h: <Text as="span" weight="bold" color="green">{formatUsd(feesLast24h)}</Text>
          </Text>
          <Text size="2" color="gray">|</Text>
          <Text size="2" color="gray">
            7d avg: <Text as="span" weight="bold">{formatUsd(fees7dAverage)}</Text>
          </Text>
          <Text size="2" color="gray">
            ({sevenDayWindowLabel})
          </Text>
        </Flex>
      </Flex>
      <div style={{ height: '200px', marginTop: 8 }}>
        {isLoading ? <SkeletonBarChart bars={20} /> : <LineChart chart={{ data: chartData }} onHover={setHovered} lineColor="#57d98e" />}
      </div>
    </Card>
  )
}

function GambaConfigForm({ onUpdated }: { onUpdated: () => Promise<void> }) {
  const { send, ready, signer } = useSendSmartTransaction()
  const { rpcUrl } = useGambaRpc()
  const toast = useToast()
  const gambaStateQuery = useGambaState()

  const gambaState = gambaStateQuery.data?.exists ? (gambaStateQuery.data.data as any) : null

  const [authorityInput, setAuthorityInput] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [input, setInput] = React.useState(() => ({
    rngAddress: String(gambaState?.rngAddress ?? ''),
    gambaFee: String(Number(gambaState?.gambaFeeBps ?? 0) / 100),
    maxCreatorFee: String(Number(gambaState?.maxCreatorFeeBps ?? 0) / 100),
    poolCreationFee: String(Number(gambaState?.poolCreationFee ?? 0) / 1e9),
    antiSpamFee: String(Number(gambaState?.antiSpamFee ?? 0) / 1e9),
    maxHouseEdge: String(Number(gambaState?.maxHouseEdgeBps ?? 0) / 100),
    defaultPoolFee: String(Number(gambaState?.defaultPoolFee ?? 0) / 100),
    jackpotPayoutToUserBps: String(Number(gambaState?.jackpotPayoutToUserBps ?? 0) / 100),
    jackpotPayoutToCreatorBps: String(Number(gambaState?.jackpotPayoutToCreatorBps ?? 0) / 100),
    jackpotPayoutToPoolBps: String(Number(gambaState?.jackpotPayoutToPoolBps ?? 0) / 100),
    jackpotPayoutToGambaBps: String(Number(gambaState?.jackpotPayoutToGambaBps ?? 0) / 100),
    bonusToJackpotRatioBps: String(Number(gambaState?.bonusToJackpotRatioBps ?? 0) / 100),
    maxPayoutBps: String(Number(gambaState?.maxPayoutBps ?? 0) / 100),
    poolWithdrawFeeBps: String(Number(gambaState?.poolWithdrawFeeBps ?? 0) / 100),
    poolCreationAllowed: Boolean(gambaState?.poolCreationAllowed),
    poolDepositAllowed: Boolean(gambaState?.poolDepositAllowed),
    poolWithdrawAllowed: Boolean(gambaState?.poolWithdrawAllowed),
    playingAllowed: Boolean(gambaState?.playingAllowed),
    distributionRecipient: String(gambaState?.distributionRecipient ?? ''),
  }))

  React.useEffect(() => {
    if (!gambaState) return
    setInput({
      rngAddress: String(gambaState.rngAddress ?? ''),
      gambaFee: String(Number(gambaState.gambaFeeBps ?? 0) / 100),
      maxCreatorFee: String(Number(gambaState.maxCreatorFeeBps ?? 0) / 100),
      poolCreationFee: String(Number(gambaState.poolCreationFee ?? 0) / 1e9),
      antiSpamFee: String(Number(gambaState.antiSpamFee ?? 0) / 1e9),
      maxHouseEdge: String(Number(gambaState.maxHouseEdgeBps ?? 0) / 100),
      defaultPoolFee: String(Number(gambaState.defaultPoolFee ?? 0) / 100),
      jackpotPayoutToUserBps: String(Number(gambaState.jackpotPayoutToUserBps ?? 0) / 100),
      jackpotPayoutToCreatorBps: String(Number(gambaState.jackpotPayoutToCreatorBps ?? 0) / 100),
      jackpotPayoutToPoolBps: String(Number(gambaState.jackpotPayoutToPoolBps ?? 0) / 100),
      jackpotPayoutToGambaBps: String(Number(gambaState.jackpotPayoutToGambaBps ?? 0) / 100),
      bonusToJackpotRatioBps: String(Number(gambaState.bonusToJackpotRatioBps ?? 0) / 100),
      maxPayoutBps: String(Number(gambaState.maxPayoutBps ?? 0) / 100),
      poolWithdrawFeeBps: String(Number(gambaState.poolWithdrawFeeBps ?? 0) / 100),
      poolCreationAllowed: Boolean(gambaState.poolCreationAllowed),
      poolDepositAllowed: Boolean(gambaState.poolDepositAllowed),
      poolWithdrawAllowed: Boolean(gambaState.poolWithdrawAllowed),
      playingAllowed: Boolean(gambaState.playingAllowed),
      distributionRecipient: String(gambaState.distributionRecipient ?? ''),
    })
  }, [gambaState])

  const updateInput = (patch: Partial<typeof input>) => setInput((prev) => ({ ...prev, ...patch }))

  const initialize = async () => {
    if (!ready || !signer) throw new Error('Wallet not connected')
    setLoading(true)
    try {
      const ix = await core.getGambaInitializeInstructionAsync({ initializer: signer as any })
      const signature = await send([ix as any])
      toast({ title: 'Gamba initialized', description: signature, link: getExplorerTxUrl(signature, rpcUrl) })
      await onUpdated()
    } finally {
      setLoading(false)
    }
  }

  const update = async () => {
    if (!ready || !signer) throw new Error('Wallet not connected')
    setLoading(true)
    try {
      const bps = (value: string) => Math.round(Number(value || '0') * 100)
      const ix = await core.getGambaSetConfigInstructionAsync({
        authority: signer as any,
        rngAddress: input.rngAddress as Address,
        gambaFee: bps(input.gambaFee),
        maxCreatorFee: bps(input.maxCreatorFee),
        poolCreationFee: Math.round(Number(input.poolCreationFee || '0') * 1e9),
        antiSpamFee: Math.round(Number(input.antiSpamFee || '0') * 1e9),
        maxHouseEdge: bps(input.maxHouseEdge),
        defaultPoolFee: bps(input.defaultPoolFee),
        jackpotPayoutToUserBps: bps(input.jackpotPayoutToUserBps),
        jackpotPayoutToCreatorBps: bps(input.jackpotPayoutToCreatorBps),
        jackpotPayoutToPoolBps: bps(input.jackpotPayoutToPoolBps),
        jackpotPayoutToGambaBps: bps(input.jackpotPayoutToGambaBps),
        bonusToJackpotRatioBps: bps(input.bonusToJackpotRatioBps),
        maxPayoutBps: bps(input.maxPayoutBps),
        poolWithdrawFeeBps: bps(input.poolWithdrawFeeBps),
        poolCreationAllowed: input.poolCreationAllowed,
        poolDepositAllowed: input.poolDepositAllowed,
        poolWithdrawAllowed: input.poolWithdrawAllowed,
        playingAllowed: input.playingAllowed,
        distributionRecipient: input.distributionRecipient as Address,
      })

      const signature = await send([ix as any])
      toast({ title: 'Gamba config updated', description: signature, link: getExplorerTxUrl(signature, rpcUrl) })
      await onUpdated()
    } finally {
      setLoading(false)
    }
  }

  const setAuthority = async () => {
    if (!ready || !signer) throw new Error('Wallet not connected')
    if (!authorityInput) throw new Error('Set authority first')
    setLoading(true)
    try {
      const ix = await core.getGambaSetAuthorityInstructionAsync({
        authority: signer as any,
        authorityArg: authorityInput as Address,
      })
      const signature = await send([ix as any])
      toast({ title: 'Authority updated', description: signature, link: getExplorerTxUrl(signature, rpcUrl) })
      await onUpdated()
    } finally {
      setLoading(false)
    }
  }

  if (!gambaState) {
    return (
      <Button disabled={loading} onClick={initialize}>
        {loading ? 'Initializing…' : 'Initialize Gamba'}
      </Button>
    )
  }

  return (
    <Flex gap="2" direction="column">
      <DetailCard title="Authority">
        <TextField.Root value={authorityInput || String(gambaState.authority)} onChange={(event) => setAuthorityInput(event.target.value)} />
      </DetailCard>
      <Button onClick={setAuthority} variant="soft" disabled={loading}>
        Update authority
      </Button>

      <DetailCard title="RNG address">
        <TextField.Root value={input.rngAddress} onChange={(event) => updateInput({ rngAddress: event.target.value })} />
      </DetailCard>

      <DetailCard title="DAO fee %">
        <TextField.Root type="number" value={input.gambaFee} onChange={(event) => updateInput({ gambaFee: event.target.value })} />
      </DetailCard>

      <DetailCard title="Max creator fee %">
        <TextField.Root type="number" value={input.maxCreatorFee} onChange={(event) => updateInput({ maxCreatorFee: event.target.value })} />
      </DetailCard>

      <DetailCard title="Default pool fee %">
        <TextField.Root type="number" value={input.defaultPoolFee} onChange={(event) => updateInput({ defaultPoolFee: event.target.value })} />
      </DetailCard>

      <DetailCard title="Distribution recipient">
        <TextField.Root value={input.distributionRecipient} onChange={(event) => updateInput({ distributionRecipient: event.target.value })} />
      </DetailCard>

      <DetailCard title="Pool creation enabled">
        <input type="checkbox" checked={input.poolCreationAllowed} onChange={(event) => updateInput({ poolCreationAllowed: event.target.checked })} />
      </DetailCard>
      <DetailCard title="Pool deposit enabled">
        <input type="checkbox" checked={input.poolDepositAllowed} onChange={(event) => updateInput({ poolDepositAllowed: event.target.checked })} />
      </DetailCard>
      <DetailCard title="Pool withdraw enabled">
        <input type="checkbox" checked={input.poolWithdrawAllowed} onChange={(event) => updateInput({ poolWithdrawAllowed: event.target.checked })} />
      </DetailCard>
      <DetailCard title="Playing enabled">
        <input type="checkbox" checked={input.playingAllowed} onChange={(event) => updateInput({ playingAllowed: event.target.checked })} />
      </DetailCard>

      <Button variant="soft" onClick={update} disabled={loading}>
        {loading ? 'Updating…' : 'Update'}
      </Button>
    </Flex>
  )
}

export default function DaoView() {
  const getTokenMeta = useGetTokenMeta()
  const gambaStateQuery = useGambaState()
  const gambaStateAddress = gambaStateQuery.data?.exists ? String(gambaStateQuery.data.address) : null
  const gambaState = gambaStateQuery.data?.exists ? (gambaStateQuery.data.data as any) : null

  const user = useWalletAddress()
  const { send, ready, signer } = useSendSmartTransaction()
  const { rpcUrl } = useGambaRpc()
  const toast = useToast()

  const tokens = useTokenAccountsByOwner(gambaStateAddress)
  const nativeBalance = useNativeBalance(gambaStateAddress)

  const isGambaStateAuthority = Boolean(user && gambaState && String(gambaState.authority) === user)

  const distributeFees = async (underlyingTokenMint: string, isNative = false) => {
    if (!ready || !signer) throw new Error('Wallet not connected')
    if (!gambaStateAddress || !gambaState) throw new Error('Gamba state not initialized')

    const [gambaStateAta, distributionRecipientAta] = await Promise.all([
      pdas.deriveAta(gambaStateAddress as Address, underlyingTokenMint as Address),
      pdas.deriveAta(String(gambaState.distributionRecipient) as Address, underlyingTokenMint as Address),
    ])

    const ix = await core.getDistributeFeesInstructionAsync({
      signer: signer as any,
      underlyingTokenMint: underlyingTokenMint as Address,
      gambaState: gambaStateAddress as Address,
      gambaStateAta,
      distributionRecipient: String(gambaState.distributionRecipient) as Address,
      distributionRecipientAta,
      associatedTokenProgram: pdas.ASSOCIATED_TOKEN_PROGRAM_ID,
      nativeSol: isNative,
    })

    const signature = await send([ix as any])
    toast({
      title: 'Distributed fees',
      description: signature,
      link: getExplorerTxUrl(signature, rpcUrl),
    })

    await Promise.all([gambaStateQuery.refetch(), tokens.refetch(), nativeBalance.refetch()])
  }

  const tokenRows = React.useMemo(() => {
    const rows = [...tokens.accounts]
    return rows.sort((a, b) => {
      const aMeta = getTokenMeta(a.mint)
      const bMeta = getTokenMeta(b.mint)
      const aValue = (aMeta.usdPrice * Number(a.amount)) / 10 ** aMeta.decimals
      const bValue = (bMeta.usdPrice * Number(b.amount)) / 10 ** bMeta.decimals
      return bValue - aValue
    })
  }, [getTokenMeta, tokens.accounts])

  const combinedTokens = React.useMemo(
    () => [{ mint: NATIVE_MINT, amount: nativeBalance.balance, isNative: true }, ...tokenRows.map((token) => ({ ...token, isNative: false }))],
    [nativeBalance.balance, tokenRows],
  )

  const total = React.useMemo(
    () =>
      combinedTokens.reduce((sum, token) => {
        const meta = getTokenMeta(token.mint)
        return sum + (meta.usdPrice * Number(token.amount)) / 10 ** meta.decimals
      }, 0),
    [combinedTokens, getTokenMeta],
  )

  return (
    <Grid gap="4" columns={{ initial: '1', sm: '1', md: '2' }}>
      <Flex gap="4" direction="column">
        <TotalVolume />
        <Card>
          <Flex direction="column" gap="2">
            <Text color="gray">DAO Details</Text>
            {gambaStateAddress ? <SolanaAddress address={gambaStateAddress} /> : <Text color="gray">Not initialized</Text>}
            <Text>
              Balance ${total.toLocaleString(undefined, { maximumFractionDigits: 1 })}
            </Text>
            {gambaState && (
              <Text color="gray" size="2">
                Fee {bpsToPercentString(gambaState.gambaFeeBps)} | Default pool fee {bpsToPercentString(gambaState.defaultPoolFee)}
              </Text>
            )}
          </Flex>
        </Card>

        {isGambaStateAuthority && (
          <ButtonWithDialog label={<><GearIcon /> Config</>}>
            <GambaConfigForm onUpdated={async () => { await gambaStateQuery.refetch() }} />
          </ButtonWithDialog>
        )}
      </Flex>

      <Card>
        <Flex direction="column" gap="4">
          {combinedTokens.map((token, index) => (
            <Card key={token.isNative ? `native-${token.mint}` : `token-${token.mint}-${(token as any).ata ?? index}`}>
              <TokenItem
                mint={token.mint}
                balance={Number(token.amount)}
                stuff={
                  <>
                    {token.isNative && '(Native) '} <TokenValue2 dollar mint={token.mint} amount={Number(token.amount)} />
                    {isGambaStateAuthority && (
                      <Button size="2" variant="soft" onClick={() => distributeFees(token.mint, token.isNative)}>
                        Distribute
                      </Button>
                    )}
                  </>
                }
              />
            </Card>
          ))}
        </Flex>
      </Card>
    </Grid>
  )
}
