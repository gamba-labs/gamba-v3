Place custom token logos here.

Convention:
- File path: `/tokens/<mint>.png`
- Example: `/tokens/So11111111111111111111111111111111111111112.png`

Resolver priority used by explorer:
1. `src/config/token-overrides.ts` (`logoURI`)
2. Local logo at `/tokens/<mint>.png`
3. Jupiter token index logo
4. Avatar/initial fallback

Tip:
- You can also override `name`, `symbol`, and `decimals` in `token-overrides.ts`.
