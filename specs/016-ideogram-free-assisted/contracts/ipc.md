# IPC Contract: Ideogram gratuito assistido

## `start-ideogram-download-watch`

Input: `{ slideId, prompt }`

Output: `{ sessionId, downloadsDirectory, startedAt }`

Rules: cancela a sessão anterior; não abre o site; não inicia IA local; rejeita `slideId` ou prompt ausentes.

## `cancel-ideogram-download-watch`

Input: `{ sessionId }`

Output: `{ cancelled: boolean }`

## `open-ideogram-web`

Input: nenhum.

Output: `true` após solicitar ao sistema a abertura de `https://ideogram.ai/`.

## Events

### `ideogram-download-status`

Payload: `{ sessionId, slideId, state, message?, fileName? }`

States: `watching`, `stabilizing`, `importing`, `completed`, `cancelled`, `failed`.

### `ideogram-download-ready`

Payload: `{ sessionId, slideId, image, fileName, mimeType, bytes }`

`image` é data URL de PNG, JPEG ou WebP com no máximo 50 MB.
