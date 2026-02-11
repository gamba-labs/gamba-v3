import { useConnector } from '@solana/connector'
import { EnterIcon } from '@radix-ui/react-icons'
import { Button, Card, Flex, Grid, Heading, Text } from '@radix-ui/themes'
import React from 'react'

export function ConnectUserCard({ onConnect }: { onConnect: () => void }) {
  const { isConnecting } = useConnector()

  return (
    <Card size="3">
      <Grid gap="4" align="center" justify="center">
        <Heading align="center">Not Connected</Heading>
        <Text align="center" color="gray">
          Connect your wallet to continue.
        </Text>
        <Flex align="center" justify="center">
          <Button disabled={isConnecting} onClick={onConnect} size="3" variant="soft">
            Connect <EnterIcon />
          </Button>
        </Flex>
      </Grid>
    </Card>
  )
}
