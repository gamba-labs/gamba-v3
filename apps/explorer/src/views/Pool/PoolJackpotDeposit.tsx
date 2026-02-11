import { TokenValue2 } from '@/components/TokenValue2'
import { NATIVE_MINT } from '@/constants'
import { useBalance, useTokenMeta, useToast } from '@/hooks'
import { numberToBigIntUnits } from '@/lib/format'
import type { UiPool } from '@/lib/pool'
import { getExplorerTxUrl } from '@/lib/solana'
import { pdas } from '@gamba/core'
import { useGambaRpc, useSendSmartTransaction } from '@gamba/react'
import { AccountRole, type Address, type Instruction } from '@solana/kit'
import { Button, Dialog, Flex, Grid, Heading, IconButton, Text, TextField } from '@radix-ui/themes'
import React from 'react'

function createTokenTransferInstruction(params: {
  source: Address
  destination: Address
  owner: Address
  amount: bigint
}): Instruction<Address> {
  const data = new Uint8Array(9)
  data[0] = 3
  let remaining = params.amount
  for (let index = 0; index < 8; index += 1) {
    data[index + 1] = Number(remaining & 0xffn)
    remaining >>= 8n
  }

  return {
    programAddress: pdas.TOKEN_PROGRAM_ID,
    accounts: [
      { address: params.source, role: AccountRole.WRITABLE },
      { address: params.destination, role: AccountRole.WRITABLE },
      { address: params.owner, role: AccountRole.READONLY_SIGNER },
    ],
    data,
  }
}

export function PoolJackpotDeposit({ pool }: { pool: UiPool }) {
  const [donateAmountText, setDonateAmountText] = React.useState('')
  const { send, ready, signer } = useSendSmartTransaction()
  const { rpcUrl } = useGambaRpc()
  const toast = useToast()
  const token = useTokenMeta(pool.underlyingTokenMint)
  const balances = useBalance(pool.underlyingTokenMint)
  const [loading, setLoading] = React.useState(false)

  const donateToJackpot = async () => {
    if (!ready || !signer) throw new Error('Wallet not connected')

    if (pool.underlyingTokenMint === NATIVE_MINT) {
      throw new Error('Native SOL jackpot donations require wrapped SOL. Use WSOL mint directly.')
    }

    const amount = numberToBigIntUnits(donateAmountText, token.decimals)
    if (amount <= 0n) throw new Error('Amount must be greater than zero')

    setLoading(true)
    try {
      const userAddress = String((signer as any).address) as Address
      const userAta = await pdas.deriveAta(userAddress, pool.underlyingTokenMint as Address)
      const poolJackpotAddress = await pdas.derivePoolJackpotTokenAccountPda(pool.publicKey as Address)

      const transferInstruction = createTokenTransferInstruction({ source: userAta, destination: poolJackpotAddress, owner: userAddress, amount })

      const signature = await send([transferInstruction])

      toast({
        title: 'Donation successful',
        description: signature,
        link: getExplorerTxUrl(signature, rpcUrl),
      })

      setDonateAmountText('')
      await balances.refetch()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Grid gap="2">
      <Heading>Fund Jackpot</Heading>
      <Text color="gray">Donate {token.symbol} to this pool jackpot.</Text>

      <TextField.Root
        placeholder="Amount"
        value={donateAmountText}
        size="3"
        onFocus={(event) => event.target.select()}
        onChange={(event) => setDonateAmountText(event.target.value)}
      >
        <TextField.Slot>
          <IconButton onClick={() => setDonateAmountText(String(Number(balances.balance) / 10 ** token.decimals))} size="1" variant="ghost">
            MAX
          </IconButton>
        </TextField.Slot>
      </TextField.Root>

      <Flex justify="between">
        <Text size="2" color="gray">
          Balance
        </Text>
        <Text size="2">
          <TokenValue2 exact amount={balances.balance} mint={pool.underlyingTokenMint} />
        </Text>
      </Flex>

      <Dialog.Root>
        <Dialog.Trigger>
          <Button size="3" variant="soft" disabled={loading}>
            {loading ? 'Donating…' : 'Donate'}
          </Button>
        </Dialog.Trigger>
        <Dialog.Content>
          <Grid gap="2">
            <Text>Jackpot donations are not withdrawable and are used to incentivize play.</Text>
            <Dialog.Close>
              <Button size="3" color="red" variant="soft" onClick={donateToJackpot}>
                Donate
              </Button>
            </Dialog.Close>
          </Grid>
        </Dialog.Content>
      </Dialog.Root>
    </Grid>
  )
}
