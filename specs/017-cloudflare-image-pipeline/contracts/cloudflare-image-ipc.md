# IPC Contract

## `save-cloudflare-config`

Input: `{ accountId, apiToken }`  
Output: `{ configured: true, accountIdHint }`

## `cloudflare-config-status`

Output: `{ configured, accountIdHint }` — nunca inclui token.

## `verify-cloudflare-config`

Output: `{ ok, message }`

## `generate-cloudflare-image`

Input: `{ prompt, width, height, seed, guidance, cacheMode }`  
Output: `{ image, provider, model, fromCache, durationMs, cacheKey }`

## `clear-cloudflare-config`

Output: `{ configured: false }`
