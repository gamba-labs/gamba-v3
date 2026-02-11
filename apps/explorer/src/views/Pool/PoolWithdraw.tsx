import { TokenValue2 } from '@/components/TokenValue2'
import { useBalance, useTokenMeta, useToast } from '@/hooks'
import { numberToBigIntUnits } from '@/lib/format'
import type { UiPool } from '@/lib/pool'
import { getExplorerTxUrl } from '@/lib/solana'
import { instructions } from '@gamba/core'
import { useGambaRpc, useSendSmartTransaction } from '@gamba/react'
import { Button, Flex, Grid, IconButton, Text, TextField } from '@radix-ui/themes'
import React from 'react'

export function PoolWithdraw({ pool }: { pool: UiPool }) {
  const token = useTokenMeta(pool.underlyingTokenMint)
  const { lpBalance, refetch } = useBalance(pool.underlyingTokenMint, pool.poolAuthority)
  const { send, ready, signer } = useSendSmartTransaction()
  const { rpcUrl } = useGambaRpc()
  const toast = useToast()

  const [amountText, setAmountText] = React.useState('')
  const [loading, setLoading] = React.useState(false)

  const amount = numberToBigIntUnits(amountText, token.decimals)
  const receiveUnderlyingAmount = BigInt(Math.floor(Number(amount) * pool.ratio))

  const withdraw = async () => {
    if (!ready || !signer) throw new Error('Wallet not connected')
    if (amount <= 0n) throw new Error('Amount must be greater than zero')
    if (amount > lpBalance) throw new Error('Amount exceeds LP balance')

    setLoading(true)
    try {
      const ix = await instructions.singleplayer.buildPoolWithdrawInstruction({
        user: signer as any,
        pool: pool.publicKey as any,
        underlyingTokenMint: pool.underlyingTokenMint as any,
        amount,
      })

      const signature = await send([ix])
      toast({
        title: 'Withdraw successful',
        description: signature,
        link: getExplorerTxUrl(signature, rpcUrl),
      })

      setAmountText('')
      await refetch()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Grid gap="2">
      <TextField.Root
        placeholder="Amount"
        value={amountText}
        size="3"
        onChange={(event) => setAmountText(event.target.value)}
        onFocus={(event) => event.target.select()}
      >
        <TextField.Slot>
          <IconButton onClick={() => setAmountText(String((Number(lpBalance) / 10 ** token.decimals) * 0.25))} variant="ghost">
            25%
          </IconButton>
          <IconButton onClick={() => setAmountText(String((Number(lpBalance) / 10 ** token.decimals) * 0.5))} variant="ghost">
            50%
          </IconButton>
          <IconButton onClick={() => setAmountText(String(Number(lpBalance) / 10 ** token.decimals))} variant="ghost">
            MAX
          </IconButton>
        </TextField.Slot>
      </TextField.Root>

      <Flex justify="between">
        <Text color="gray">Receive</Text>
        <Text>
          <TokenValue2 exact amount={receiveUnderlyingAmount} mint={pool.underlyingTokenMint} />
        </Text>
      </Flex>

      <Flex justify="between">
        <Text color="gray">Value</Text>
        <Text>
          <TokenValue2 dollar amount={receiveUnderlyingAmount} mint={pool.underlyingTokenMint} />
        </Text>
      </Flex>

      <Button size="3" variant="soft" onClick={withdraw} disabled={loading || amount <= 0n || amount > lpBalance}>
        {loading ? 'Withdrawing…' : 'Withdraw'}
      </Button>
    </Grid>
  )
}
