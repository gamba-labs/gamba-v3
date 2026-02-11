import { useGambaRpc } from '@gamba/react'
import { Button, Card, Flex, Heading, Text } from '@radix-ui/themes'
import React from 'react'
import { openExternal } from '@/lib/openExternal'

export default function DebugView() {
  const { rpcUrl, wsUrl } = useGambaRpc()

  return (
    <Card style={{ maxWidth: '760px', margin: '0 auto' }} size="4">
      <Heading mb="4">Debug tools</Heading>
      <Flex gap="3" direction="column">
        <Text color="gray">Use these utility actions while testing explorer integrations.</Text>
        <Text>RPC: {rpcUrl}</Text>
        <Text>WS: {wsUrl}</Text>
        <Button variant="soft" onClick={() => window.location.reload()}>
          Reload explorer
        </Button>
        <Button variant="soft" onClick={() => openExternal('https://api.gamba.so/status')}>
          Open API status
        </Button>
      </Flex>
    </Card>
  )
}
