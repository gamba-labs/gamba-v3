# Gamba v3 (Work In Progress)

This repo is an experimental, simplified rewrite focused on Solana Kit and a clean package surface.

Stable release:
- [gamba-labs/gamba](https://github.com/gamba-labs/gamba)

## Package Model

- `@gamba/core`: Chain/program logic, codama-generated accounts/instructions, PDA helpers.
- `@gamba/react`: Minimal React integration for v1 (`GambaReactProvider`, `useGambaRpc`, `useSendSmartTransaction`, account fetch hooks).

## Apps

- `apps/platform-template`: Primary template app and first consumer of `@gamba/react`.
- `apps/basic-example`: Debug app using `@gamba/core`.
- `apps/explorer`: Explorer app rebuilt for v3 using connector + `@gamba/react` + `@gamba/core` instructions.

## Migration Status

- `@gamba/core` + `@gamba/react` architecture is active.
- Platform template migrated to `@gamba/core` + `@gamba/react`.
- Basic example migrated to `@gamba/core`.
