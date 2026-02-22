# Building Gamba Games in V3 (Platform Template)

This guide explains how games in this repo are built around Gamba's core outcome-array model.

It is based on the current implementation in:
- `apps/platform-template/src/hooks/useGambaPlay.ts`
- `apps/platform-template/src/game-ui/GameRuntimeContext.tsx`
- `apps/platform-template/src/games/*`

## 1. Core Gamba Model (Important)

Every play sends:
- `wager`: amount in token atomic units (lamports for SOL, token decimals for SPL)
- `bet`: array of multipliers

The protocol picks exactly one index from the `bet` array with equal probability.

If your array length is `N`:
- each index has probability `1 / N`
- selected multiplier is `bet[resultIndex]`
- payout is `wager * bet[resultIndex]`

In this repo, multipliers are passed as decimal numbers in UI code, then converted to BPS in `useGambaPlay`:
- `1.0x` -> `10000`
- `2.0x` -> `20000`
- `0.5x` -> `5000`

## 2. The Rule: sum(bet) must not be greater than length

Expected multiplier is:

`E = sum(bet) / N`

So:
- `sum(bet) == N` -> fair game before fees (EV = 1.0x)
- `sum(bet) < N` -> house edge (EV < 1.0x)
- `sum(bet) > N` -> player edge (EV > 1.0x), not allowed

This repo enforces the rule in `useGambaPlay`:
- empty arrays rejected
- negative outcomes rejected
- `sum(bet) > bet.length` rejected

If violated, `play` throws before transaction send.

## 3. Equal-random selection behavior

Think of `bet` as a wheel with `N` equal slots.

Example:
- `bet = [2, 0]`
- 2 slots, each 50%
- one slot pays `2x`, one pays `0x`

Another:
- `bet = [3, 3, 0, 0, 0, 0]`
- 6 slots, two winning slots each `3x`
- EV = `(3+3)/6 = 1`

## 4. How this repo wires a game play

The game-facing API is in `GameRuntimeContext`:

```ts
await game.play({ wager, bet, metadata })
const result = await game.result()
```

Flow:
1. Game builds `bet` and `wager`.
2. `GameRuntimeContext` wraps metadata as JSON: `{ gameId, args }`.
3. `useGambaPlay` validates and sends transaction.
4. Settlement watcher waits for game-account nonce update.
5. Result comes back with `resultIndex`, `payout`, `multiplierBps`.

## 5. Practical design tips

- Build in BPS mentally. If you use decimals, rounding can drift.
- Keep `sum(bet)` at or below `length`, ideally exactly equal for fair odds.
- For dynamic games, clamp by `pool.maxPayout` before allowing play.
- Use `resultIndex` when your UI needs exact slot/card/bin mapping.
- Use `result.payout > 0` only when binary win/loss animation is enough.
- Include metadata if recent-plays UX needs extra context (side, level, etc).

## 6. Current games analysis (as implemented)

### Flip (`apps/platform-template/src/games/Flip/index.tsx`)
- Bet arrays:
  - Heads: `[2, 0]`
  - Tails: `[0, 2]`
- Length `2`, sum `2`, EV `1.0`.
- Uses `resultIndex` for 3D coin face/result animation.
- Metadata includes side (`heads` / `tails`).

### Dice (`apps/platform-template/src/games/Dice/index.tsx`)
- Builds array from selected odds via `outcomes(odds)`.
- Array length is reduced by GCD math (`100 / gcd(100, odds)`).
- Payout per winning slot is `100 / odds`.
- Includes adjustment to keep `sum <= length` after float rounding.
- UI roll number is simulated from win/loss state, not from exact `resultIndex`.

### Slots (`apps/platform-template/src/games/Slots/index.tsx` + `utils.ts`)
- `generateBetArray(maxPayout, wager, maxLength=50)` creates weighted outcome array.
- Uses multipliers from slot items (`7, 5, 3, 2, 1, 0.5`) and zeros.
- Target behavior is `sum == length` when valid.
- Clamps with `maxMultiplier = min(maxLength, maxPayout / wager)`.
- Uses `result.multiplier` to choose revealed combination.

### HiLo (`apps/platform-template/src/games/HiLo/index.tsx`)
- Outcome space is card ranks (`13` outcomes).
- Builds two arrays (`betHi`, `betLo`) from current rank.
- Uses formula `RANKS / winningOutcomeCount` for winning entries.
- Runs `adjustBetArray` to ensure `sum <= length` after rounding.
- Uses `result.resultIndex` as the next card rank.

### Mines (`apps/platform-template/src/games/Mines/index.tsx`)
- Per level:
  - `remainingCells = GRID_SIZE - currentLevel`
  - `multiplier = remainingCells / (remainingCells - mines)`
  - `bet = [0 ... (mines entries), multiplier ...]`
- Sum is exactly `remainingCells` each round (fair per round before fees).
- Uses metadata with level index.
- Current selection index is used for UI reveal; game outcome is still decided by random result index from the array model.

### Roulette (`apps/platform-template/src/games/Roulette/index.tsx` + `signals.ts`)
- Current implementation is `18` numbers (`1..18`) plus group bets.
- Chip placements are distributed across covered numbers.
- Final per-number bet array is normalized from distributed chip weights.
- Uses BPS/floor math so normalized sum is at or below array length.
- Uses `resultIndex` to append spin history.

### Plinko (`apps/platform-template/src/games/Plinko/index.tsx`)
- Uses fixed arrays:
  - Normal: length `66`, sum `66`
  - Degen: length `49`, sum `49`
- EV is exactly `1.0` before fees in both presets.
- Physics engine runs local visual simulation to land in bucket matching `result.multiplier`.
- Uses multiplier result rather than direct index mapping for animation path.

### Crash (`apps/platform-template/src/games/Crash/index.tsx` + `utils.ts`)
- `calculateBetArray(targetMultiplier)` builds arrays where `sum == length`.
- Uses repeat-and-zero construction so fractional multipliers still satisfy the rule.
- On win, UI shows target multiplier.
- On loss, UI simulates a lower crash point locally for animation feel.

### BlackJack (`apps/platform-template/src/games/BlackJack/index.tsx`)
- Fixed `17`-outcome array:
  - two `2.5x` entries (blackjack bucket)
  - six `2x` entries (regular win bucket)
  - nine `0x` entries (loss bucket)
- Length `17`, sum `17`, EV `1.0` before fees.
- Hand visuals are generated client-side from payout class (`blackjack/win/lose`), not from card-by-card on-chain state.

## 7. New game checklist

- Define outcome space (`N`).
- Build `bet` with `sum(bet) <= N`.
- Validate max payout against pool.
- Call `game.play({ wager, bet, metadata })`.
- Resolve `result` and animate from `resultIndex` or `result.multiplier`.
- Add metadata for recent-play decoding if needed.

## 8. Common mistakes

- Forgetting sum rule (`sum > N`) -> rejected in `useGambaPlay`.
- Float drift causing accidental sum overflow.
- Building UI that assumes weighted randomness by value (Gamba is equal index chance, not weighted by multiplier value).
- Ignoring token base wager units.

## 9. Quick sanity helper

Before sending, check:

```ts
const sum = bet.reduce((a, b) => a + b, 0)
if (bet.length === 0) throw new Error('Empty bet array')
if (sum > bet.length) throw new Error('Player edge array is invalid')
```

## 10. Multiplayer model (different from outcome arrays)

Singleplayer and multiplayer are different paths:

- Singleplayer (`useGambaPlay`) uses the outcome-array model described above.
- Multiplayer uses the multiplayer program account model (`@gamba/core` multiplayer accounts + instructions).

In multiplayer, players do **not** submit `bet` arrays per play. Instead they:
- create a game lobby
- join with a wager
- optionally edit wager
- wait for winner selection

So the `sum(bet) <= length` rule is a **singleplayer** rule, not a multiplayer rule.

## 11. Multiplayer lifecycle in this repo

Main integration lives in:
- `apps/platform-template/src/games/PlinkoRace/multiplayer.ts`

Key client actions:
- `createGame(...)`
- `joinGame(...)`
- `editBet(...)` (implemented as leave + join in one tx)
- `leaveGame(...)`

Game data flow:
- list/poll games via `usePlinkoRaceGames(filters, pollMs)`
- subscribe to one game via `usePlinkoRaceGame(gameAddress)`
- read state from `game.state` (`Waiting`, `Playing`, `Settled`)
- read winner(s) from `game.winnerIndexes`

## 12. Multiplayer wager types

Current multiplayer wager modes supported by core:
- `SameWager`: everyone uses exactly `game.wager`
- `CustomWager`: players can join with arbitrary wager
- `BetRange`: players can join between `minBet` and `maxBet`

This repo handles all three in UI (`Join`, `Edit Bet`, and create modal constraints).

## 13. Multiplayer metadata pattern

Player metadata is a fixed 32-byte field in multiplayer accounts and is used for lightweight per-player context.

Examples in this repo:
- PvpFlip stores side choice (`heads` / `tails`)
- PlinkoRace uses optional short display names

Pattern:
- write metadata on join/edit
- read metadata from multiplayer metadata PDA
- keep payload short and deterministic

## 14. Current multiplayer games in this repo

### PlinkoRace (`apps/platform-template/src/games/PlinkoRace/*`)
- Base multiplayer implementation.
- Uses create/join/edit/leave against multiplayer program.
- Filters game list by lobby constraints (players/winners/mint).
- Renders race UI from multiplayer state and winner index.

### PvpFlip (`apps/platform-template/src/games/PvpFlip/*`)
- 1v1 multiplayer lobby on the same multiplayer primitives.
- Side selection is encoded in player metadata (`heads`/`tails`).
- Winner side is derived from `winnerIndexes -> winner player -> metadata side`.
- Includes a local “Call a Bot” fallback path that exits multiplayer and executes a singleplayer flip.

### Jackpot (`apps/platform-template/src/games/Jackpot/*`)
- Multiplayer jackpot-style room UX on top of shared multiplayer hooks.
- Uses creator/max-player/winner-target filters for the intended room family.
- Supports join/edit/leave during waiting state and winner animation on settle.

## 15. Multiplayer game checklist

- Define lobby shape:
  - `maxPlayers`
  - `winnersTarget`
  - `mint`
  - wager mode (`SameWager` / `CustomWager` / `BetRange`)
- Build create/join/edit/leave controls with guardrails for wager type bounds.
- Subscribe to live game + metadata updates.
- Handle all states (`Waiting`, `Playing`, `Settled`) explicitly in UI.
- Render result from `winnerIndexes` (not local guesswork).
- Keep metadata compact (<= 32 bytes effective payload).
- Keep token math in atomic units (lamports / token decimals).
