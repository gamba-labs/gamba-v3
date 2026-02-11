import { TokenAvatar } from '@/components'
import { TokenValue2 } from '@/components/TokenValue2'
import { SYSTEM_PROGRAM } from '@/constants'
import { useGetTokenMeta, useTokenList } from '@/hooks'
import { core, instructions, pdas } from '@gamba/core'
import { useGambaRpc, useGambaState, useSendSmartTransaction } from '@gamba/react'
import { Badge, Button, Card, Flex, Grid, Link, Select, Switch, Text, TextField } from '@radix-ui/themes'
import {
  getCreateLookupTableInstructionAsync,
  getExtendLookupTableInstruction,
  getFreezeLookupTableInstruction,
} from '@solana-program/address-lookup-table'
import { isAddress, type Address } from '@solana/kit'
import React from 'react'
import { useNavigate } from 'react-router-dom'
import useSWR from 'swr'

function toBigInt(value: unknown): bigint {
  if (typeof value === 'bigint') return value
  if (typeof value === 'number') return BigInt(Math.floor(value))
  if (typeof value === 'string' && value.trim()) return BigInt(value)
  return 0n
}

function formatInt(value: bigint | number | null | undefined) {
  if (value == null) return '0'
  const n = typeof value === 'bigint' ? value : BigInt(Math.floor(value))
  return n.toLocaleString()
}

function formatPercentFromBps(value: bigint | number | null | undefined) {
  if (value == null) return '0%'
  const n = Number(typeof value === 'bigint' ? value : BigInt(Math.floor(value)))
  return `${(n / 100).toLocaleString(undefined, { maximumFractionDigits: 4 })}%`
}

function txExplorerUrl(signature: string, rpcUrl: string) {
  const cluster = rpcUrl.includes('devnet') ? 'devnet' : rpcUrl.includes('testnet') ? 'testnet' : 'mainnet'
  return `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`
}

function toSlotBigInt(value: unknown): bigint {
  if (typeof value === 'bigint') return value
  if (typeof value === 'number' && Number.isFinite(value)) return BigInt(Math.floor(value))

  const maybeValue = (value as any)?.value
  if (typeof maybeValue === 'bigint') return maybeValue
  if (typeof maybeValue === 'number' && Number.isFinite(maybeValue)) return BigInt(Math.floor(maybeValue))

  return 0n
}

export default function CreatePoolView() {
  const navigate = useNavigate()
  const { ready, signer, simulate, send } = useSendSmartTransaction()
  const { rpc, rpcUrl } = useGambaRpc()
  const gambaStateQuery = useGambaState()
  const gambaState = gambaStateQuery.data?.exists ? (gambaStateQuery.data.data as any) : null
  const { tokens, isLoading: isLoadingTokens } = useTokenList()
  const getTokenMeta = useGetTokenMeta()

  const [tokenChoice, setTokenChoice] = React.useState('')
  const [customMint, setCustomMint] = React.useState('')
  const [isPrivate, setIsPrivate] = React.useState(false)
  const [loading, setLoading] = React.useState<'none' | 'sim' | 'send'>('none')
  const [status, setStatus] = React.useState<{ type: 'ok' | 'error'; text: string } | null>(null)

  const tokenOptions = React.useMemo(() => {
    const totalsByMint = new Map<string, bigint>()
    for (const token of tokens) {
      totalsByMint.set(token.mint, (totalsByMint.get(token.mint) ?? 0n) + token.amount)
    }
    return Array.from(totalsByMint.entries())
      .map(([mint, amount]) => ({ mint, amount }))
      .sort((a, b) => {
        if (a.amount === b.amount) return a.mint > b.mint ? 1 : -1
        return a.amount > b.amount ? -1 : 1
      })
  }, [tokens])

  React.useEffect(() => {
    if (tokenChoice || tokenOptions.length === 0) return
    setTokenChoice(tokenOptions[0].mint)
  }, [tokenChoice, tokenOptions])

  const mint = (tokenChoice === 'custom' ? customMint : tokenChoice).trim()
  const poolAuthority = isPrivate ? String(signer?.address ?? '') : SYSTEM_PROGRAM
  const canDerivePool = isAddress(mint) && isAddress(poolAuthority)

  const { data: derivedPool } = useSWR(
    canDerivePool ? ['derive-pool', mint, poolAuthority] : null,
    async () => pdas.derivePoolPda(mint as Address, poolAuthority as Address),
  )

  const { data: poolExists = false, isLoading: isCheckingPool } = useSWR(
    derivedPool ? ['pool-exists', derivedPool] : null,
    async () => {
      const maybePool = await core.fetchMaybePool(rpc, derivedPool as Address)
      return maybePool.exists
    },
  )

  const selectedTokenMeta = React.useMemo(() => {
    if (tokenChoice === 'custom') {
      if (!isAddress(customMint)) return null
      return getTokenMeta(customMint)
    }
    if (!tokenChoice) return null
    return getTokenMeta(tokenChoice)
  }, [tokenChoice, customMint, getTokenMeta])

  const onRun = async (mode: 'sim' | 'send') => {
    setLoading(mode)
    setStatus(null)
    try {
      if (!ready || !signer) throw new Error('Wallet is not ready')
      if (!isAddress(mint)) throw new Error('Invalid underlying token mint')
      if (!isAddress(poolAuthority)) throw new Error('Invalid pool authority for selected visibility mode')

      const mintAddress = mint as Address
      const poolAuthorityAddress = poolAuthority as Address
      const derivedPool = await pdas.derivePoolPda(mintAddress, poolAuthorityAddress)
      const existingPool = await core.fetchMaybePool(rpc, derivedPool)
      if (existingPool.exists) throw new Error(`Pool already exists: ${derivedPool}`)

      const lookupAccounts = await instructions.singleplayer.getPoolInitializeLookupAddresses({
        underlyingTokenMint: mintAddress,
        poolAuthority: poolAuthorityAddress,
      })

      const slotResponse = await (rpc as any).getSlot().send()
      const currentSlot = toSlotBigInt(slotResponse)
      if (currentSlot < 2n) throw new Error('Failed to fetch a valid current slot')

      const lutCreateIx = await getCreateLookupTableInstructionAsync({
        authority: signer as any,
        payer: signer as any,
        recentSlot: currentSlot - 1n,
      })

      const lookupAddress = String(lutCreateIx.accounts[0]?.address ?? '')
      if (!isAddress(lookupAddress)) throw new Error('Failed to derive lookup table address')

      const lutExtendIx = getExtendLookupTableInstruction({
        address: lookupAddress as Address,
        authority: signer as any,
        payer: signer as any,
        addresses: lookupAccounts.addresses as Address[],
      })

      const lutFreezeIx = getFreezeLookupTableInstruction({
        address: lookupAddress as Address,
        authority: signer as any,
      })

      const poolInitializeIx = await instructions.singleplayer.buildPoolInitializeInstruction({
        initializer: signer as any,
        underlyingTokenMint: mintAddress,
        poolAuthority: poolAuthorityAddress,
        lookupAddress: lookupAddress as Address,
      })

      const txInstructions = [lutCreateIx as any, lutExtendIx as any, lutFreezeIx as any, poolInitializeIx as any]

      if (mode === 'sim') {
        const sim = await simulate(txInstructions)
        setStatus({
          type: 'ok',
          text: `Simulation completed: ${JSON.stringify((sim as any)?.value?.err ?? null)}. Derived pool: ${derivedPool}. LUT: ${lookupAddress}`,
        })
        return
      }

      const signature = await send(txInstructions)
      const url = txExplorerUrl(signature, rpcUrl)
      setStatus({
        type: 'ok',
        text: `Pool initialized. Signature: ${signature}. Derived pool: ${derivedPool}. LUT: ${lookupAddress}. Explorer: ${url}`,
      })
      navigate(`/pool/${derivedPool}`)
    } catch (error) {
      setStatus({ type: 'error', text: error instanceof Error ? error.message : String(error) })
    } finally {
      setLoading('none')
    }
  }

  const poolCreationAllowed = gambaState ? Boolean(gambaState.poolCreationAllowed) : true
  const disabled = !ready || !signer || loading !== 'none' || !poolCreationAllowed || !isAddress(mint) || poolExists

  return (
    <Flex direction="column" gap="4">
      <Card>
        <Flex direction="column" gap="2">
          <Text color="gray">Create Pool</Text>
          <Text size="2">Select a token, choose public or private, and create. LUT setup is automatic.</Text>
        </Flex>
      </Card>

      <Card>
        <Grid gap="4">
          <Flex direction="column" gap="1">
            <Text size="2" color="gray">Token</Text>
            <Select.Root value={tokenChoice || undefined} onValueChange={setTokenChoice}>
              <Select.Trigger placeholder={isLoadingTokens ? 'Loading wallet tokens…' : 'Select token'} />
              <Select.Content>
                <Select.Item value="custom">Custom mint…</Select.Item>
                {tokenOptions.length > 0 && <Select.Separator />}
                <Select.Group>
                  {tokenOptions.map((token) => {
                    const meta = getTokenMeta(token.mint)
                    return (
                      <Select.Item key={token.mint} value={token.mint}>
                        <Flex gap="2" align="center">
                          <TokenAvatar mint={token.mint} size="1" />
                          <Text>{meta.symbol}</Text>
                          <Text color="gray">{meta.name}</Text>
                        </Flex>
                      </Select.Item>
                    )
                  })}
                </Select.Group>
              </Select.Content>
            </Select.Root>
            <Text size="1" color="gray">Choose from wallet tokens or use a custom mint.</Text>
          </Flex>

          {tokenChoice === 'custom' && (
            <Flex direction="column" gap="1">
              <Text size="2" color="gray">Custom Token Mint</Text>
              <TextField.Root
                value={customMint}
                onChange={(event) => setCustomMint(event.target.value.trim())}
                placeholder="Enter token mint address"
              />
            </Flex>
          )}

          {selectedTokenMeta && (
            <Card size="1">
              <Flex justify="between" align="center" gap="3">
                <Flex gap="2" align="center">
                  <TokenAvatar mint={selectedTokenMeta.mint} size="2" />
                  <Flex direction="column">
                    <Text>{selectedTokenMeta.name}</Text>
                    <Text size="1" color="gray">{selectedTokenMeta.symbol}</Text>
                  </Flex>
                </Flex>
                {tokenOptions.some((token) => token.mint === selectedTokenMeta.mint) && (
                  <Text size="2" color="gray">
                    <TokenValue2 mint={selectedTokenMeta.mint} amount={tokenOptions.find((token) => token.mint === selectedTokenMeta.mint)?.amount ?? 0n} />
                  </Text>
                )}
              </Flex>
            </Card>
          )}

          <Flex align="center" justify="between" p="2">
            <Flex direction="column" gap="1">
              <Text size="2">Private Pool</Text>
              <Text size="1" color="gray">
                Off: public pool authority ({SYSTEM_PROGRAM}), On: your wallet authority.
              </Text>
            </Flex>
            <Switch
              radius="full"
              checked={isPrivate}
              onCheckedChange={setIsPrivate}
            />
          </Flex>

          <Grid columns={{ initial: '1', sm: '2' }} gap="3">
            <Flex direction="column" gap="1">
              <Text size="1" color="gray">Pool Authority</Text>
              <Text size="1" style={{ overflowWrap: 'anywhere' }}>{poolAuthority}</Text>
            </Flex>
            <Flex direction="column" gap="1">
              <Text size="1" color="gray">Derived Pool</Text>
              <Text size="1" style={{ overflowWrap: 'anywhere' }}>
                {derivedPool ?? 'Select a valid token mint'}
              </Text>
            </Flex>
          </Grid>

          {gambaState && (
            <Flex gap="2" wrap="wrap">
              <Badge color={gambaState.poolCreationAllowed ? 'green' : 'orange'}>
                Pool creation {gambaState.poolCreationAllowed ? 'enabled' : 'disabled'}
              </Badge>
              <Badge variant="soft">Default fee {formatPercentFromBps(gambaState.defaultPoolFee)}</Badge>
              <Badge variant="soft">Create fee {formatInt(toBigInt(gambaState.poolCreationFee))}</Badge>
              <Badge color={isPrivate ? 'orange' : 'green'}>{isPrivate ? 'PRIVATE' : 'PUBLIC'}</Badge>
            </Flex>
          )}

          {derivedPool && poolExists && (
            <Link onClick={() => navigate(`/pool/${derivedPool}`)}>
              This pool already exists. Open pool.
            </Link>
          )}

          <Flex gap="2">
            <Button variant="soft" disabled={disabled} onClick={() => onRun('sim')}>
              {loading === 'sim' ? 'Simulating…' : 'Simulate'}
            </Button>
            <Button disabled={disabled} onClick={() => onRun('send')}>
              {loading === 'send' ? 'Sending…' : 'Create Pool'}
            </Button>
          </Flex>

          {isCheckingPool && <Text color="gray">Checking for existing pool…</Text>}
          {!ready && <Text color="gray">Connect wallet to create pools.</Text>}
          {!poolCreationAllowed && <Text color="orange">Pool creation is disabled in current gamba state.</Text>}
          {!isAddress(mint) && <Text color="orange">Enter a valid token mint to continue.</Text>}
          {status && (
            <Text color={status.type === 'error' ? 'red' : 'green'} style={{ overflowWrap: 'anywhere' }}>
              {status.text}
            </Text>
          )}
        </Grid>
      </Card>
    </Flex>
  )
}
