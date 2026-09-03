# Data model: Persistência integral

## ProjectStoreV1

- `schemaVersion`: `1`
- `revision`: inteiro monotônico
- `savedAt`: ISO-8601
- `currentProjectId`: string opcional
- `current`: projeto corrente completo ou `null`
- `projects`: lista de projetos completos

## Estado transitório de imagem

- `completed`, `idle` e `failed` permanecem intactos.
- `pending` ou `generating` vira `paused` na restauração.
- Nenhum estado inicia geração sem nova ação explícita.

## Regras

1. Revisão menor não substitui revisão atual.
2. O temporário só substitui o principal após JSON válido ser escrito.
3. Dados antigos são importados do localStorage uma vez.
