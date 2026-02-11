Place custom token logos here for template projects.

Conventions:
- If a token in `src/config/constants.ts` has id `mytoken`, this file is auto-tried:
  - `/tokens/mytoken.png`
- You can also set `image` directly per token, for example:
  - `image: '/tokens/mytoken.png'`
  - or any full URL.

Logo fallback order used by the template:
1. `token.image` (if set)
2. `/tokens/<token-id>.png`
3. Indexed logo by mint from token-list
4. First letter fallback in UI components that support avatar fallback
