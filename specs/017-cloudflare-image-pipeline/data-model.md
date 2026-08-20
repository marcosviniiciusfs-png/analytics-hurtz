# Data Model

## CloudflareConfig

- `accountId`: identificador da conta validado
- `apiToken`: segredo criptografado, nunca retornado ao renderer
- `updatedAt`: ISO date

## ImageRequest

- `prompt`, `width`, `height`, `seed`, `guidance`
- `primaryModel`, `fallbackModel`, `cacheMode`, `pipelineVersion`

## ImageResult

- `image`, `provider`, `model`, `fromCache`, `durationMs`, `cacheKey`

## SlideImageJob

- estados: `pending -> generating -> auditing -> completed`
- falhas: `configuration`, `authentication`, `quota`, `network`, `model`, `validation`
