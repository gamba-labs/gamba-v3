# Gamba v3

This repo is the v3 rewrite focused on Solana Kit + a cleaner package/app surface.

Stable legacy release:
- [gamba-labs/gamba](https://github.com/gamba-labs/gamba)

## Requirements

- Node `>=22`
- pnpm `10.29.3` (pinned via `packageManager`)

## Packages

- `@gamba/core`: Program/codama logic, PDA helpers, instruction builders.
- `@gamba/react`: React provider/hooks for RPC, state reads, and smart sends.

## Apps

- `apps/explorer` (`http://localhost:4000`)
- `apps/platform-template` (`http://localhost:4001`)
- `apps/basic-example` (`http://localhost:4002`)

## Setup

```bash
pnpm install
```

## Run

Run everything (Turbo):

```bash
pnpm dev
```

Run a single app:

```bash
pnpm --filter @gamba/explorer dev
pnpm --filter @gamba/platform-template dev
pnpm --filter @gamba/basic-example dev
```

## Build

```bash
pnpm build
```

## Migration Status

- `@gamba/core` + `@gamba/react` are active and used by all current apps.
- Explorer is rebuilt on v3 stack (`@solana/connector`, `@gamba/react`, `@gamba/core`).
