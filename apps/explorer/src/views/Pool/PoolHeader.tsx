import { TokenAvatar } from '@/components'
import { SolanaAddress } from '@/components/SolanaAddress'
import { useTokenMeta, useWalletAddress } from '@/hooks'
import type { UiPool } from '@/lib/pool'
import { GearIcon, InfoCircledIcon } from '@radix-ui/react-icons'
import { Dialog, Flex, Heading, IconButton, Text } from '@radix-ui/themes'
import React from 'react'
import { NavLink, useNavigate } from 'react-router-dom'

export function PoolHeader({ pool, canConfigure }: { pool: UiPool; canConfigure?: boolean }) {
  const token = useTokenMeta(pool.underlyingTokenMint)
  const navigate = useNavigate()
  const user = useWalletAddress()
  const isPoolAuthority = user && pool.poolAuthority === user

  return (
    <Flex gap="4" align="center" wrap="wrap">
      <NavLink to={`/pool/${pool.publicKey}`} style={{ display: 'contents', color: 'unset', textDecoration: 'none' }}>
        <TokenAvatar size="3" mint={pool.underlyingTokenMint} />
        <Flex align="center" gap="2">
          <Heading>{token.name}</Heading>
          <Text color="gray" size="4">
            {token.symbol}
          </Text>
        </Flex>
      </NavLink>

      {(canConfigure || isPoolAuthority) && (
        <IconButton size="2" variant="ghost" onClick={() => navigate(`/pool/${pool.publicKey}/configure`)}>
          <GearIcon />
        </IconButton>
      )}

      <Dialog.Root>
        <Dialog.Trigger>
          <IconButton size="2" variant="ghost">
            <InfoCircledIcon />
          </IconButton>
        </Dialog.Trigger>
        <Dialog.Content>
          <Dialog.Title>Pool Details</Dialog.Title>
          <Dialog.Description>
            <Flex direction="column" gap="2">
              <Text color="gray" size="2">
                Underlying token mint
              </Text>
              <SolanaAddress address={pool.underlyingTokenMint} />
              <Text color="gray" size="2">
                Pool address
              </Text>
              <SolanaAddress address={pool.publicKey} />
              <Text color="gray" size="2">
                Pool authority
              </Text>
              <SolanaAddress address={pool.poolAuthority} />
            </Flex>
          </Dialog.Description>
        </Dialog.Content>
      </Dialog.Root>
    </Flex>
  )
}
