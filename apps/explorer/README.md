# Gamba Explorer v3

Explorer app rebuilt for the v3 stack:

- Solana wallet connection via `@solana/connector`
- RPC/state hooks via `@gamba/react`
- Instruction builders via `@gamba/core`

## Run

```bash
pnpm --filter @gamba/explorer dev
```

Server runs on `http://localhost:5175`.

## Build

```bash
pnpm --filter @gamba/explorer build
```

## Env

Copy `apps/explorer/.env.example` and set:

- `VITE_SOLANA_RPC_URL` (mainnet/devnet/custom RPC endpoint)
- `VITE_GAMBA_API_ENDPOINT` (defaults to `https://api.gamba.so`)

Token metadata (name/symbol/icon/price) is fetched from Jupiter's free public API at `https://lite-api.jup.ag/tokens/v2/search`.

## Token Logos

Explorer token metadata/logo resolution order:

1. `src/config/token-overrides.ts`
2. Local logo files in `public/tokens/<mint>.png` (or `.svg`, `.webp`, `.jpg`, `.jpeg`)
3. Jupiter index metadata
4. UI fallback avatar/initials
