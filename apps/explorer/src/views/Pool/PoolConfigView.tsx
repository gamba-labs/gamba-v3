import { ConnectUserCard } from '@/components/ConnectUserCard'
import { useTokenMeta, useWalletAddress } from '@/hooks'
import { bpsToPercentString, numberToBigIntUnits, toBigInt } from '@/lib/format'
import { fetchPoolDetails } from '@/lib/pool'
import { getExplorerTxUrl } from '@/lib/solana'
import { PoolHeader } from '@/views/Pool/PoolHeader'
import { core, pdas } from '@gamba/core'
import { useGambaRpc, useGambaState, useSendSmartTransaction } from '@gamba/react'
import { useConnector } from '@solana/connector'
import { isAddress, type Address } from '@solana/kit'
import { Button, Card, Flex, Grid, Text, TextField } from '@radix-ui/themes'
import React from 'react'
import { useParams } from 'react-router-dom'
import useSWR from 'swr'

interface PoolAuthorityConfigInput {
  minWager: string
  depositLimit: boolean
  depositLimitAmount: string
  customPoolFee: boolean
  customPoolFeePercent: string
  customMaxPayout: boolean
  customMaxPayoutPercent: string
  depositWhitelistRequired: boolean
  depositWhitelistAddress: string
  antiSpamFeeExemption: boolean
  customGambaFeeEnabled: boolean
  customGambaFeePercent: string
}

const Thing = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Grid columns="2">
    <Text>{title}</Text>
    {children}
  </Grid>
)

function toBpsPercentInput(value: bigint | number | undefined) {
  if (value == null) return '0'
  return String(Number(value) / 100)
}

export default function PoolConfigureView() {
  const { poolId = '' } = useParams<{ poolId: string }>()
  const { isConnected, connectWallet, connectors, isConnecting } = useConnector()
  const walletAddress = useWalletAddress()
  const { rpc, rpcUrl } = useGambaRpc()
  const { send, ready, signer } = useSendSmartTransaction()
  const gambaStateQuery = useGambaState()

  const validAddress = isAddress(poolId)

  const { data: pool, isLoading, mutate } = useSWR(
    validAddress ? `pool-config-${poolId}` : null,
    async () => fetchPoolDetails(rpc, poolId as Address),
  )

  const token = useTokenMeta(pool?.underlyingTokenMint ?? '')

  const [input, setInput] = React.useState<PoolAuthorityConfigInput | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [status, setStatus] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!pool) return
    setInput({
      minWager: String(Number(pool.state.minWager ?? 0) / 10 ** (token.decimals || 0)),
      depositLimit: Boolean(pool.state.depositLimit),
      depositLimitAmount: String(Number(pool.state.depositLimitAmount ?? 0) / 10 ** (token.decimals || 0)),
      customPoolFee: Boolean(pool.state.customPoolFee),
      customPoolFeePercent: toBpsPercentInput(Number(pool.state.customPoolFeeBps ?? 0)),
      customMaxPayout: Boolean(pool.state.customMaxPayout),
      customMaxPayoutPercent: toBpsPercentInput(Number(pool.state.customMaxPayoutBps ?? 0)),
      depositWhitelistRequired: Boolean(pool.state.depositWhitelistRequired),
      depositWhitelistAddress: String(pool.state.depositWhitelistAddress ?? pdas.SYSTEM_PROGRAM_ID),
      antiSpamFeeExemption: Boolean(pool.state.antiSpamFeeExempt),
      customGambaFeeEnabled: Boolean(pool.state.customGambaFee),
      customGambaFeePercent: toBpsPercentInput(Number(pool.state.customGambaFeeBps ?? 0)),
    })
  }, [pool, token.decimals])

  if (!validAddress) return <Text color="red">Invalid pool address</Text>
  if (isLoading || !pool || !input) return <Text color="gray">Loading pool config…</Text>

  const gambaState = gambaStateQuery.data?.exists ? (gambaStateQuery.data.data as any) : null
  const isPoolAuthority = walletAddress && walletAddress === pool.poolAuthority
  const isGambaAuthority = walletAddress && gambaState && walletAddress === String(gambaState.authority)
  const canEdit = Boolean(isPoolAuthority || isGambaAuthority)

  const updateInput = (patch: Partial<PoolAuthorityConfigInput>) => {
    setInput((prev) => ({ ...(prev as PoolAuthorityConfigInput), ...patch }))
  }

  const saveConfig = async () => {
    if (!ready || !signer) throw new Error('Wallet not connected')
    if (!canEdit) throw new Error('Only pool or gamba authority can configure this pool')
    if (!isAddress(input.depositWhitelistAddress)) throw new Error('Whitelist address is invalid')

    const minWager = numberToBigIntUnits(input.minWager, token.decimals)
    const depositLimitAmount = numberToBigIntUnits(input.depositLimitAmount, token.decimals)
    const customPoolFeeBps = Math.round(Number(input.customPoolFeePercent || '0') * 100)
    const customMaxPayoutBps = Math.round(Number(input.customMaxPayoutPercent || '0') * 100)
    const customGambaFeeBps = Math.round(Number(input.customGambaFeePercent || '0') * 100)

    setLoading(true)
    setStatus(null)

    try {
      const ixs = [
        await core.getPoolAuthorityConfigInstructionAsync({
          user: signer as any,
          pool: pool.publicKey as Address,
          minWager,
          depositLimit: input.depositLimit,
          depositLimitAmount,
          customPoolFee: input.customPoolFee,
          customPoolFeeBps,
          customMexPayout: input.customMaxPayout,
          customMaxPayoutBps,
          depositWhitelistRequired: input.depositWhitelistRequired,
          depositWhitelistAddress: input.depositWhitelistAddress as Address,
        }),
      ] as any[]

      if (isGambaAuthority) {
        ixs.push(
          await core.getPoolGambaConfigInstructionAsync({
            user: signer as any,
            pool: pool.publicKey as Address,
            antiSpamFeeExemption: input.antiSpamFeeExemption,
            customGambaFee: input.customGambaFeeEnabled,
            customGambaFeeBps,
          }),
        )
      }

      const signature = await send(ixs as any)
      setStatus(`Updated pool config: ${signature} (${getExplorerTxUrl(signature, rpcUrl)})`)
      await mutate()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Grid gap="4">
      <Flex justify="between" align="end" py="4">
        <PoolHeader pool={pool} canConfigure={canEdit} />
      </Flex>

      {!isConnected ? (
        <ConnectUserCard
          onConnect={() => {
            const connector = connectors.find((c) => c.ready)
            if (connector) void connectWallet(connector.id)
          }}
        />
      ) : (
        <Card size="3">
          <Flex direction="column" gap="2">
            <Thing title="Min Wager Amount">
              <TextField.Root value={input.minWager} onChange={(event) => updateInput({ minWager: event.target.value })} />
            </Thing>

            <Thing title="Deposit Limit Enabled">
              <input type="checkbox" checked={input.depositLimit} onChange={(event) => updateInput({ depositLimit: event.target.checked })} />
            </Thing>

            <Thing title="Deposit Limit Amount">
              <TextField.Root
                value={input.depositLimitAmount}
                onChange={(event) => updateInput({ depositLimitAmount: event.target.value })}
                type="number"
                disabled={!input.depositLimit}
              />
            </Thing>

            <Thing title="Custom Pool Fee Enabled">
              <input type="checkbox" checked={input.customPoolFee} onChange={(event) => updateInput({ customPoolFee: event.target.checked })} />
            </Thing>

            <Thing title={`Custom Pool Fee % (${bpsToPercentString(toBigInt(pool.state.customPoolFeeBps ?? 0))})`}>
              <TextField.Root
                value={input.customPoolFeePercent}
                onChange={(event) => updateInput({ customPoolFeePercent: event.target.value })}
                type="number"
                disabled={!input.customPoolFee}
              />
            </Thing>

            <Thing title="Custom max payout enabled">
              <input type="checkbox" checked={input.customMaxPayout} onChange={(event) => updateInput({ customMaxPayout: event.target.checked })} />
            </Thing>

            <Thing title="Max payout %">
              <TextField.Root
                value={input.customMaxPayoutPercent}
                onChange={(event) => updateInput({ customMaxPayoutPercent: event.target.value })}
                type="number"
                disabled={!input.customMaxPayout}
              />
            </Thing>

            <Thing title="Deposit whitelist required">
              <input
                type="checkbox"
                checked={input.depositWhitelistRequired}
                onChange={(event) => updateInput({ depositWhitelistRequired: event.target.checked })}
              />
            </Thing>

            <Thing title="Whitelist address">
              <TextField.Root
                value={input.depositWhitelistAddress}
                onChange={(event) => updateInput({ depositWhitelistAddress: event.target.value })}
                disabled={!input.depositWhitelistRequired}
              />
            </Thing>

            {isGambaAuthority && (
              <>
                <Thing title="Anti-spam fee exemption">
                  <input
                    type="checkbox"
                    checked={input.antiSpamFeeExemption}
                    onChange={(event) => updateInput({ antiSpamFeeExemption: event.target.checked })}
                  />
                </Thing>
                <Thing title="Custom gamba fee enabled">
                  <input
                    type="checkbox"
                    checked={input.customGambaFeeEnabled}
                    onChange={(event) => updateInput({ customGambaFeeEnabled: event.target.checked })}
                  />
                </Thing>
                <Thing title="Custom gamba fee %">
                  <TextField.Root
                    value={input.customGambaFeePercent}
                    onChange={(event) => updateInput({ customGambaFeePercent: event.target.value })}
                    type="number"
                    disabled={!input.customGambaFeeEnabled}
                  />
                </Thing>
              </>
            )}

            <Button onClick={saveConfig} disabled={loading || !canEdit || isConnecting}>
              {loading ? 'Updating…' : 'Update'}
            </Button>
            {!canEdit && <Text color="orange">Connect as pool authority or gamba authority to edit.</Text>}
            {status && <Text color="green">{status}</Text>}
          </Flex>
        </Card>
      )}
    </Grid>
  )
}
