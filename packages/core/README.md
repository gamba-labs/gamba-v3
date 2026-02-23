# @gamba/core

Minimal, program-level Gamba client for Solana.

This package is intentionally split into two layers:

- `src/codama/*`: generated low-level client from IDLs.
- `src/instructions/*`: handwritten convenience builders used by apps.

## Installation

```bash
pnpm add @gamba/core
```

## Exports

- `@gamba/core` -> full generated + helper surface.
- `@gamba/core/core` -> singleplayer codama module.
- `@gamba/core/multiplayer` -> multiplayer codama module.
- `@gamba/core/referral` -> referral codama module.
- `@gamba/core/pdas` -> PDA helpers.

## Quick Usage

```ts
import { instructions } from '@gamba/core'

const ix = await instructions.singleplayer.buildPlayerInitializeInstruction({
  user: signer, // TransactionSigner from @solana/kit / connector
})
```

```ts
import { core } from '@gamba/core'

const pool = await core.fetchPool(rpc, poolAddress)
```

## Compatibility Contract

- Generated files under `src/codama/*` are not edited manually.
- App-facing ergonomics should be added to `src/instructions/*`.
- Keep wrappers strongly typed (avoid `any` in public builder params).
- If IDLs change, regenerate codama code first, then patch wrappers.

## Development

```bash
pnpm --filter @gamba/core build
pnpm --filter @gamba/core dev
pnpm --filter @gamba/core test
```
