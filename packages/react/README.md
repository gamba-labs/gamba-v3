# @gamba/react

Minimal React helpers for Gamba v3.

## Includes

- `GambaReactProvider`
- `useGambaRpc`
- `useSendSmartTransaction`
- `useGambaState`
- `usePool`
- `usePlayer`
- `useGame`
- `usePlayerByUser`
- `useGameByUser`

## Quick Start

```tsx
import { AppProvider, getDefaultConfig } from '@solana/connector'
import { GambaReactProvider } from '@gamba/react'

const RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'

const connectorConfig = getDefaultConfig({
  appName: 'My App',
  autoConnect: true,
  clusters: [{ id: 'solana:mainnet', label: 'Mainnet', url: RPC_URL }],
})

export function Root() {
  return (
    <GambaReactProvider rpcUrl={RPC_URL}>
      <AppProvider connectorConfig={connectorConfig}>
        <App />
      </AppProvider>
    </GambaReactProvider>
  )
}
```

```tsx
import { useSendSmartTransaction } from '@gamba/react'

function SendButton({ instructions }) {
  const { send, ready } = useSendSmartTransaction()

  return (
    <button disabled={!ready} onClick={() => send(instructions)}>
      Send
    </button>
  )
}
```
