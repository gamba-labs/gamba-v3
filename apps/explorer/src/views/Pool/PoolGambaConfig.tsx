import { useToast, useWalletAddress } from '@/hooks'
import { bpsToPercentString } from '@/lib/format'
import type { UiPool } from '@/lib/pool'
import { getExplorerTxUrl } from '@/lib/solana'
import { core } from '@gamba/core'
import { useGambaRpc, useSendSmartTransaction } from '@gamba/react'
import type { Address } from '@solana/kit'
import { Button, Flex, Grid, Heading, Text, TextField } from '@radix-ui/themes'
import React from 'react'

const BPS_PER_WHOLE = 10_000

const Thing = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Grid columns="2">
    <Text>{title}</Text>
    {children}
  </Grid>
)

interface PoolConfigInput {
  antiSpamFeeExemption: boolean
  customGambaFeeEnabled: boolean
  customGambaFeePercent: string
}

export default function PoolGambaConfigDialog({ pool }: { pool: UiPool }) {
  const { send, ready, signer } = useSendSmartTransaction()
  const { rpcUrl } = useGambaRpc()
  const toast = useToast()
  const user = useWalletAddress()

  const [loading, setLoading] = React.useState(false)
  const [input, setInput] = React.useState<PoolConfigInput>({
    antiSpamFeeExemption: Boolean(pool.state.antiSpamFeeExempt),
    customGambaFeeEnabled: Boolean(pool.state.customGambaFee),
    customGambaFeePercent: String((Number(pool.state.customGambaFeeBps ?? 0) / BPS_PER_WHOLE) * 100),
  })

  const updateInput = (update: Partial<PoolConfigInput>) => {
    setInput((prevInput) => ({ ...prevInput, ...update }))
  }

  const updateConfig = async () => {
    if (!ready || !signer) throw new Error('Wallet not connected')
    if (!user) throw new Error('Wallet not connected')

    const customGambaFeeBps = Math.round((parseFloat(input.customGambaFeePercent || '0') / 100) * BPS_PER_WHOLE)

    setLoading(true)
    try {
      const ix = await core.getPoolGambaConfigInstructionAsync({
        user: signer as any,
        pool: pool.publicKey as Address,
        antiSpamFeeExemption: input.antiSpamFeeExemption,
        customGambaFee: input.customGambaFeeEnabled,
        customGambaFeeBps,
      })

      const signature = await send([ix as any])

      toast({
        title: 'Pool gamba config updated',
        description: `${bpsToPercentString(customGambaFeeBps)}`,
        link: getExplorerTxUrl(signature, rpcUrl),
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Heading>Gamba Config</Heading>
      <Flex gap="2" direction="column">
        <Thing title="Anti Spam Fee Exemption">
          <input
            type="checkbox"
            checked={input.antiSpamFeeExemption}
            onChange={(event) => updateInput({ antiSpamFeeExemption: event.target.checked })}
          />
        </Thing>
        <Thing title="Enable Custom Gamba Fee">
          <input
            type="checkbox"
            checked={input.customGambaFeeEnabled}
            onChange={(event) => updateInput({ customGambaFeeEnabled: event.target.checked })}
          />
        </Thing>
        <Thing title="Custom Gamba Fee (%)">
          <TextField.Root
            value={input.customGambaFeePercent}
            onChange={(event) => updateInput({ customGambaFeePercent: event.target.value })}
            type="number"
            step="0.01"
            disabled={!input.customGambaFeeEnabled}
            placeholder="Enter fee percentage"
          />
        </Thing>
        <Button onClick={updateConfig} disabled={loading}>
          {loading ? 'Updating…' : 'Update'}
        </Button>
      </Flex>
    </>
  )
}
