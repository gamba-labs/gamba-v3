import { TokenValue2 } from '@/components/TokenValue2'
import { useBalance, useTokenMeta, useToast } from '@/hooks'
import { numberToBigIntUnits } from '@/lib/format'
import type { UiPool } from '@/lib/pool'
import { getExplorerTxUrl } from '@/lib/solana'
import { instructions } from '@gamba/core'
import { useGambaRpc, useSendSmartTransaction } from '@gamba/react'
import { Button, Dialog, Flex, Grid, Heading, IconButton, Text, TextField } from '@radix-ui/themes'
import React from 'react'

export function PoolDeposit({ pool }: { pool: UiPool }) {
  const token = useTokenMeta(pool.underlyingTokenMint)
  const balance = useBalance(pool.underlyingTokenMint)
  const { send, ready, signer } = useSendSmartTransaction()
  const { rpcUrl } = useGambaRpc()
  const toast = useToast()

  const [loading, setLoading] = React.useState(false)
  const [amountText, setAmountText] = React.useState('')

  const amount = numberToBigIntUnits(amountText, token.decimals)
  const receiveLpAmount = pool.ratio > 0 ? BigInt(Math.floor(Number(amount) / pool.ratio)) : amount

  const deposit = async () => {
    if (!ready || !signer) throw new Error('Wallet not connected')
    if (amount <= 0n) throw new Error('Amount must be greater than zero')

    setLoading(true)
    try {
      const ix = await instructions.singleplayer.buildPoolDepositInstruction({
        user: signer as any,
        pool: pool.publicKey as any,
        underlyingTokenMint: pool.underlyingTokenMint as any,
        amount,
      })

      const signature = await send([ix])
      toast({
        title: 'Deposited to pool',
        description: signature,
        link: getExplorerTxUrl(signature, rpcUrl),
      })

      setAmountText('')
      await balance.refetch()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Grid gap="2">
      <Heading>Add Liquidity</Heading>

      <TextField.Root
        placeholder="Amount"
        value={amountText}
        size="3"
        onChange={(event) => setAmountText(event.target.value)}
        onFocus={(event) => event.target.select()}
      >
        <TextField.Slot>
          <IconButton onClick={() => setAmountText(String(Number(balance.balance) / 10 ** token.decimals))} size="1" variant="ghost">
            MAX
          </IconButton>
        </TextField.Slot>
      </TextField.Root>

      <Flex justify="between">
        <Text color="gray">Balance</Text>
        <Text>
          <TokenValue2 exact amount={balance.balance} mint={pool.underlyingTokenMint} />
        </Text>
      </Flex>

      <Flex justify="between">
        <Text color="gray">Value</Text>
        <Text>
          <TokenValue2 dollar amount={amount} mint={pool.underlyingTokenMint} />
        </Text>
      </Flex>

      <Flex justify="between">
        <Text color="gray">Receive</Text>
        <Text>
          <TokenValue2 exact amount={receiveLpAmount} mint={pool.underlyingTokenMint} suffix="LP" />
        </Text>
      </Flex>

      <Dialog.Root>
        <Dialog.Trigger>
          <Button disabled={loading || amount <= 0n} size="3" variant="soft">
            {loading ? 'Depositing…' : 'Deposit'}
          </Button>
        </Dialog.Trigger>
        <Dialog.Content>
          <Flex direction="column" gap="4">
            <Heading>Warning</Heading>
            <Text color="gray">Pool positions carry smart-contract and market risk. Deposit only what you are comfortable with.</Text>
            <Dialog.Close>
              <Button size="3" variant="soft" onClick={deposit}>
                I understand, deposit
              </Button>
            </Dialog.Close>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Grid>
  )
}
