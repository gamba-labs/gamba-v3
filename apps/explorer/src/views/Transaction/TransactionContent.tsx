import { TokenAvatar } from '@/components'
import { PlatformAccountItem, PlayerAccountItem } from '@/components/AccountItem'
import { Spinner } from '@/components/Spinner'
import { TokenValue2 } from '@/components/TokenValue2'
import { useTokenMeta } from '@/hooks'
import { BPS_PER_WHOLE } from '@/lib/format'
import { openExternal } from '@/lib/openExternal'
import { getExplorerTxUrl } from '@/lib/solana'
import { decodeGameSettledFromLogs, type SettledEvent } from '@/lib/tx/gameSettled'
import { decodeGambaTransaction } from '@/lib/tx/decode'
import { core } from '@gamba/core'
import { useGambaRpc, usePool } from '@gamba/react'
import { ArrowRightIcon, CodeIcon, ExternalLinkIcon, MixIcon, ResetIcon } from '@radix-ui/react-icons'
import { Badge, Box, Button, Card, Code, Dialog, Flex, Grid, Heading, IconButton, Link, Table, Tabs, Text, TextField } from '@radix-ui/themes'
import { isAddress, type Address } from '@solana/kit'
import React from 'react'
import styled, { css } from 'styled-components'
import useSWR from 'swr'

const LEGACY_GAMBA_PROGRAM = 'GambaXcmhJg1vgPm1Gn6mnMKGyyR3X2eSmF6yeU6XWtT'

const StyledOutcome = styled.div<{ $rank: number; $active: boolean }>`
  --rank-0: #ff293b;
  --rank-1: #ff7142;
  --rank-2: #ffa557;
  --rank-3: #ffa557;
  --rank-4: #ffd166;
  --rank-5: #fff875;
  --rank-6: #e1ff80;
  --rank-7: #60ff9b;
  background-color: var(--slate-2);

  padding: calc(var(--space-1) / 2) var(--space-2);
  min-width: 2em;
  text-align: center;
  position: relative;
  border-radius: max(var(--radius-1), var(--radius-full));
  overflow: hidden;

  &:before {
    content: '';
    width: 100%;
    height: 100%;
    left: 0;
    top: 0;
    position: absolute;
    opacity: 0.05;
  }

  ${(props) =>
    props.$active &&
    css`
      box-shadow: 0 0 0 1px currentColor;
      &:before {
        opacity: 0.15;
      }
    `}

  ${(props) => css`
    color: var(--rank-${props.$rank});
    &:before {
      background-color: var(--rank-${props.$rank});
    }
  `}
`

function Outcomes({ bet, resultIndex }: { bet: number[]; resultIndex: number }) {
  const uniqueOutcomes = Array.from(new Set(bet)).sort((a, b) => (a > b ? 1 : -1))
  return (
    <Flex gap="1" wrap="wrap">
      {bet.map((x, i) => {
        const rank = Math.floor((uniqueOutcomes.indexOf(x) / Math.max(1, uniqueOutcomes.length - 1)) * 7)
        const active = i === resultIndex
        return (
          <StyledOutcome key={i} $active={active} $rank={rank}>
            <Text size="1">{x / BPS_PER_WHOLE}x</Text>
          </StyledOutcome>
        )
      })}
    </Flex>
  )
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value === 'bigint') return Number(value)
  return Number(value ?? 0)
}

async function getHmacSha256Hex(secretKey: string, message: string): Promise<string> {
  const encoder = new TextEncoder()
  const cryptoKey = await window.crypto.subtle.importKey('raw', encoder.encode(secretKey), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await window.crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(message))
  return Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function simulateResultIndex(params: { rngSeed: string; clientSeed: string; nonce: number; betLength: number }) {
  if (params.betLength <= 0) return undefined
  const hash = await getHmacSha256Hex(params.rngSeed, `${params.clientSeed}-${params.nonce}`)
  return parseInt(hash.substring(0, 5), 16) % params.betLength
}

function VerificationSection({ settled }: { settled: SettledEvent }) {
  const [output, setOutput] = React.useState<number>()
  const [clientSeed, setClientSeed] = React.useState(String(settled.clientSeed))

  const wager = toNumber(settled.wager)
  const verifyArgs = [
    String(settled.rngSeed),
    clientSeed,
    toNumber(settled.nonce),
    wager,
    settled.bet.map((x) => x / BPS_PER_WHOLE),
  ].map((x) => JSON.stringify(x))

  const script = `
  const hmac256 = async (secretKey, message) => {
    const encoder = new TextEncoder();
    const messageUint8Array = encoder.encode(message);
    const keyUint8Array = encoder.encode(secretKey);
    const cryptoKey = await window.crypto.subtle.importKey('raw', keyUint8Array, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = await window.crypto.subtle.sign('HMAC', cryptoKey, messageUint8Array);
    return Array.from(new Uint8Array(signature)).map((b) => b.toString(16).padStart(2, '0')).join('');
  };
  (async (rngSeed, clientSeed, nonce, wager, bet) => {
    const hash = await hmac256(rngSeed, [clientSeed, nonce].join('-'));
    return parseInt(hash.substring(0, 5), 16) % bet.length;
  })(${verifyArgs}).then(console.log);
  `

  React.useEffect(() => {
    let cancelled = false
    simulateResultIndex({
      rngSeed: String(settled.rngSeed),
      clientSeed,
      nonce: toNumber(settled.nonce),
      betLength: settled.bet.length,
    })
      .then((value) => {
        if (!cancelled) setOutput(value)
      })
      .catch(() => {
        if (!cancelled) setOutput(undefined)
      })
    return () => {
      cancelled = true
    }
  }, [clientSeed, settled.bet.length, settled.nonce, settled.rngSeed])

  return (
    <Flex direction="column" gap="4">
      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Simulation</Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          <Table.Row>
            <Table.Cell>
              <Grid columns="2" gap="4">
                <Text weight="bold">Nonce</Text>
                <Text color="gray">{toNumber(settled.nonce)}</Text>
              </Grid>
            </Table.Cell>
          </Table.Row>
          <Table.Row>
            <Table.Cell>
              <Grid columns="2" gap="4">
                <Text weight="bold">RNG Seed</Text>
                <Text color="gray">{String(settled.rngSeed)}</Text>
              </Grid>
            </Table.Cell>
          </Table.Row>
          <Table.Row>
            <Table.Cell>
              <Grid columns="2" gap="4">
                <Text weight="bold">Next Hashed RNG Seed (SHA-256)</Text>
                <Text color="gray">{String(settled.nextRngSeedHashed)}</Text>
              </Grid>
            </Table.Cell>
          </Table.Row>
          <Table.Row>
            <Table.Cell>
              <Grid columns="2" gap="4">
                <Text weight="bold">Client Seed {clientSeed !== String(settled.clientSeed) && '(Edited)'}</Text>
                <TextField.Root maxLength={64} value={clientSeed} onChange={(event) => setClientSeed(event.target.value)}>
                  <TextField.Slot>
                    <IconButton
                      onClick={() =>
                        setClientSeed(
                          Array.from({ length: 16 })
                            .map(() => ((Math.random() * 16) | 0).toString(16))
                            .join(''),
                        )
                      }
                      size="1"
                      variant="ghost"
                    >
                      <MixIcon />
                    </IconButton>
                  </TextField.Slot>
                  <TextField.Slot>
                    <IconButton disabled={clientSeed === String(settled.clientSeed)} onClick={() => setClientSeed(String(settled.clientSeed))} size="1" variant="ghost">
                      <ResetIcon />
                    </IconButton>
                  </TextField.Slot>
                </TextField.Root>
              </Grid>
            </Table.Cell>
          </Table.Row>
          <Table.Row>
            <Table.Cell>
              <Grid columns="2" gap="4">
                <Text weight="bold">Simulated result</Text>
                <Flex gap="2" direction="column">
                  <Flex gap="2" align="center">
                    <Text>Payout:</Text>
                    {output !== undefined && (
                      <Code>
                        <TokenValue2 mint={String(settled.tokenMint)} amount={(settled.bet[output] / 10_000) * wager} />
                      </Code>
                    )}
                  </Flex>
                  <Outcomes bet={settled.bet} resultIndex={output ?? 0} />
                </Flex>
              </Grid>
            </Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table.Root>

      <Card>
        <Flex direction="column" gap="4">
          <Text size="4" weight="bold">
            This game is provably fair.
          </Text>
          <Text size="2">
            The result combines `rng_seed`, `client_seed`, and incrementing `nonce`. You can simulate with a custom client seed.
          </Text>
          <Dialog.Root>
            <Dialog.Trigger>
              <Link size="2">
                View code <CodeIcon />
              </Link>
            </Dialog.Trigger>
            <Dialog.Content style={{ maxWidth: 540 }}>
              <Dialog.Title>Javascript Code</Dialog.Title>
              <Dialog.Description size="2">Run this snippet in your browser console to validate result generation:</Dialog.Description>
              <Box>
                <pre>{script}</pre>
              </Box>
              <Flex gap="3" mt="4" justify="end">
                <Dialog.Close>
                  <Button variant="soft" color="gray">
                    Close
                  </Button>
                </Dialog.Close>
                <Button onClick={() => navigator.clipboard.writeText(script)} variant="solid">
                  Copy script
                </Button>
              </Flex>
            </Dialog.Content>
          </Dialog.Root>
        </Flex>
      </Card>
    </Flex>
  )
}

function TransactionDetails({ settled, signature, rpcUrl }: { settled: SettledEvent; signature: string; rpcUrl: string }) {
  const multiplier = toNumber(settled.multiplierBps) / BPS_PER_WHOLE
  const wager = toNumber(settled.wager)
  const payout = toNumber(settled.payout)
  const profit = payout - wager

  const poolAddress = String(settled.pool)
  const poolQuery = usePool({ address: isAddress(poolAddress) ? (poolAddress as Address) : undefined, enabled: isAddress(poolAddress) })
  const pool = poolQuery.data?.exists ? (poolQuery.data.data as any) : null

  return (
    <Table.Root variant="surface">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeaderCell>Details</Table.ColumnHeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        <Table.Row>
          <Table.Cell>
            <Grid columns="2" gap="4">
              <Text weight="bold">Platform</Text>
              <PlatformAccountItem address={String(settled.creator)} />
            </Grid>
          </Table.Cell>
        </Table.Row>

        <Table.Row>
          <Table.Cell>
            <Grid columns="2" gap="4">
              <Text weight="bold">Pool</Text>
              <Flex gap="2" align="center" wrap="wrap">
                <TokenAvatar size="1" mint={String(settled.tokenMint)} />
                <Link href={`/pool/${String(settled.pool)}`}>{String(settled.pool)}</Link>
                {pool && (
                  <Badge size="1">{String(pool.poolAuthority) === '11111111111111111111111111111111' ? 'PUBLIC' : 'PRIVATE'}</Badge>
                )}
              </Flex>
            </Grid>
          </Table.Cell>
        </Table.Row>

        <Table.Row>
          <Table.Cell>
            <Grid columns="2" gap="4">
              <Text weight="bold">Player</Text>
              <PlayerAccountItem address={String(settled.user)} />
            </Grid>
          </Table.Cell>
        </Table.Row>

        <Table.Row>
          <Table.Cell>
            <Grid columns="2" gap="4">
              <Text weight="bold">Metadata</Text>
              <Text>{String(settled.metadata || '')}</Text>
            </Grid>
          </Table.Cell>
        </Table.Row>

        <Table.Row>
          <Table.Cell>
            <Grid columns="2" gap="4">
              <Text weight="bold">Transaction</Text>
              <Link target="_blank" href={getExplorerTxUrl(signature, rpcUrl)} rel="noreferrer noopener">
                View in Solana Explorer <ExternalLinkIcon />
              </Link>
            </Grid>
          </Table.Cell>
        </Table.Row>

        <Table.Row>
          <Table.Cell>
            <Grid columns="2" gap="4">
              <Text weight="bold">Wager</Text>
              <Flex gap="2" align="center">
                <TokenAvatar size="1" mint={String(settled.tokenMint)} />
                <TokenValue2 amount={wager - toNumber(settled.bonusUsed)} mint={String(settled.tokenMint)} />
                {toNumber(settled.bonusUsed) > 0 && (
                  <>
                    (Bonus: <TokenValue2 exact amount={toNumber(settled.bonusUsed)} mint={String(settled.tokenMint)} />)
                  </>
                )}
              </Flex>
            </Grid>
          </Table.Cell>
        </Table.Row>

        <Table.Row>
          <Table.Cell>
            <Grid columns="2" gap="4">
              <Text weight="bold">Payout</Text>
              <Flex direction="column" gap="2">
                <Flex gap="2" align="center">
                  <TokenAvatar size="1" mint={String(settled.tokenMint)} />
                  <TokenValue2 amount={payout} mint={String(settled.tokenMint)} />
                  <Badge color={profit >= 0 ? 'green' : 'red'}>{(multiplier * 100 - 100).toLocaleString(undefined, { maximumFractionDigits: 3 })}%</Badge>
                </Flex>

                {toNumber(settled.jackpotPayoutToUser) > 0 && (
                  <Flex gap="2" align="center">
                    <TokenAvatar size="1" mint={String(settled.tokenMint)} />
                    <TokenValue2 amount={toNumber(settled.jackpotPayoutToUser)} mint={String(settled.tokenMint)} /> Jackpot
                  </Flex>
                )}
              </Flex>
            </Grid>
          </Table.Cell>
        </Table.Row>

        <Table.Row>
          <Table.Cell>
            <Grid columns="2" gap="4">
              <Text weight="bold">Fees</Text>
              <Flex gap="2" align="center">
                <TokenAvatar size="1" mint={String(settled.tokenMint)} />
                <TokenValue2
                  amount={toNumber(settled.jackpotFee) + toNumber(settled.poolFee) + toNumber(settled.creatorFee) + toNumber(settled.gambaFee)}
                  mint={String(settled.tokenMint)}
                />
              </Flex>
            </Grid>
          </Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table.Root>
  )
}

function InstructionList({ items }: { items: Awaited<ReturnType<typeof decodeGambaTransaction>>['instructions'] }) {
  if (!items.length) return <Text color="gray">No decoded gamba instructions found.</Text>

  return (
    <Table.Root variant="surface">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeaderCell>Instruction</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Source</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Index</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Data</Table.ColumnHeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {items.map((instruction) => (
          <Table.Row key={`${instruction.source}-${instruction.index}-${instruction.name}`}>
            <Table.Cell>
              <Code>{instruction.name}</Code>
            </Table.Cell>
            <Table.Cell>{instruction.source}</Table.Cell>
            <Table.Cell>{instruction.index}</Table.Cell>
            <Table.Cell>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{JSON.stringify(instruction.data, null, 2)}</pre>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  )
}

export function TransactionContent({ txId, embedded = false }: { txId: string; embedded?: boolean }) {
  const { rpc, rpcUrl } = useGambaRpc()

  const { data, isLoading, error } = useSWR(`tx-${txId}`, async () => {
    const decoded = await decodeGambaTransaction(rpc, txId)
    const logs = decoded.logs as string[]
    const settled = decodeGameSettledFromLogs(logs)

    const accountKeys = (decoded.transaction.transaction?.message?.accountKeys ?? []).map((entry: any) => String(entry))
    const isLegacy = accountKeys.includes(LEGACY_GAMBA_PROGRAM)

    return {
      ...decoded,
      settled,
      isLegacy,
    }
  })

  if (isLoading) {
    return (
      <Flex align="center" justify="center" p="4">
        <Spinner />
      </Flex>
    )
  }

  if (error || !data) {
    return <Text color="red">Failed to fetch transaction: {String((error as any)?.message ?? error)}</Text>
  }

  if (data.isLegacy) {
    return (
      <>
        <Heading mb="4">This is a legacy transaction</Heading>
        <Button onClick={() => openExternal(`https://v1.gamba.so/tx/${txId}`)}>
          Verify in V1 Explorer <ArrowRightIcon />
        </Button>
      </>
    )
  }

  const topSummary = (
    <Card>
      <Grid gap="2">
        <Text color="gray">Transaction</Text>
        <Code>{txId}</Code>
        <Text>
          Status: {data.err ? 'Failed' : 'Success'} | Slot: {data.slot.toLocaleString()} | Fee: {(data.feeLamports / 1e9).toFixed(6)} SOL
        </Text>
        <Flex gap="2" wrap="wrap">
          <Button variant="soft" onClick={() => openExternal(getExplorerTxUrl(txId, rpcUrl))}>
            Open in Solana Explorer <ExternalLinkIcon />
          </Button>
          {data.blockTime && <Text color="gray">{new Date(data.blockTime).toLocaleString()}</Text>}
        </Flex>
      </Grid>
    </Card>
  )

  if (!data.settled) {
    return (
      <Grid gap="4">
        {topSummary}
        <InstructionList items={data.instructions} />
        {!embedded && (
          <Card>
            <Text color="gray">Raw logs</Text>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{(data.logs || []).join('\n')}</pre>
          </Card>
        )}
      </Grid>
    )
  }

  return (
    <Tabs.Root defaultValue="details">
      <Grid gap="4">
        {topSummary}
        <TransactionDetails settled={data.settled} signature={txId} rpcUrl={rpcUrl} />
        <VerificationSection settled={data.settled} />
        {!embedded && <InstructionList items={data.instructions} />}
      </Grid>
    </Tabs.Root>
  )
}
