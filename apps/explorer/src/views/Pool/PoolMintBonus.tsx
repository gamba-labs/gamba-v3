import { TokenValue2 } from '@/components/TokenValue2'
import { useBalance, useTokenMeta, useToast } from '@/hooks'
import { numberToBigIntUnits } from '@/lib/format'
import type { UiPool } from '@/lib/pool'
import { getExplorerTxUrl } from '@/lib/solana'
import { instructions, pdas } from '@gamba/core'
import { useGambaRpc, useSendSmartTransaction } from '@gamba/react'
import type { Address } from '@solana/kit'
import { Button, Flex, Grid, Heading, IconButton, Text, TextField } from '@radix-ui/themes'
import React from 'react'

export function PoolMintBonus({ pool }: { pool: UiPool }) {
  const token = useTokenMeta(pool.underlyingTokenMint)
  const balances = useBalance(pool.underlyingTokenMint)
  const { send, ready, signer } = useSendSmartTransaction()
  const { rpcUrl } = useGambaRpc()
  const toast = useToast()

  const [loading, setLoading] = React.useState(false)
  const [amountText, setAmountText] = React.useState('')

  const mintBonusTokens = async () => {
    if (!ready || !signer) throw new Error('Wallet not connected')

    const amount = numberToBigIntUnits(amountText, token.decimals)
    if (amount <= 0n) throw new Error('Amount must be greater than zero')

    setLoading(true)
    try {
      const bonusMint = await pdas.derivePoolBonusMintPda(pool.publicKey as Address)
      const userBonusAta = await pdas.deriveAta((signer as any).address as Address, bonusMint)

      const ix = await instructions.singleplayer.buildPoolMintBonusTokensInstruction({
        user: signer as any,
        pool: pool.publicKey as Address,
        underlyingTokenMint: pool.underlyingTokenMint as Address,
        userBonusAta,
        bonusMint,
        amount,
      } as any)

      const signature = await send([ix])
      toast({
        title: 'Bonus tokens minted',
        description: signature,
        link: getExplorerTxUrl(signature, rpcUrl),
      })

      setAmountText('')
      await balances.refetch()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Grid gap="2">
      <Heading>Mint Bonus Tokens</Heading>
      <Text color="gray" size="2">
        Bonus tokens are free-play credits tied to this pool.
      </Text>

      <TextField.Root placeholder="Amount" value={amountText} size="3" onChange={(event) => setAmountText(event.target.value)}>
        <TextField.Slot>
          <IconButton onClick={() => setAmountText(String(Number(balances.balance) / 10 ** token.decimals))} size="1" variant="ghost">
            MAX
          </IconButton>
        </TextField.Slot>
      </TextField.Root>

      <Flex justify="between">
        <Text color="gray" size="2">
          Balance
        </Text>
        <Text size="2">
          <TokenValue2 exact amount={balances.balance} mint={pool.underlyingTokenMint} />
        </Text>
      </Flex>

      <Button size="3" variant="soft" onClick={mintBonusTokens} disabled={loading}>
        {loading ? 'Minting…' : 'Mint'}
      </Button>
    </Grid>
  )
}
