# Data Model: Corrigir geração Creators

## Creator Slide

- `role`: `hook | body | cta`
- `creatorVariant`: assinatura visual determinada pelo papel e posição
- `imageLayout`: `none | background | grid`
- `imageRequired`: derivado da composição e da variante
- `image`: resultado válido, quando concluído
- `visualFailure`: erro recuperável mais recente

## Image Job Item

- `projectToken`: identifica a geração/projeto de origem
- `slideIndex`: índice do slide alvo
- `status`: `pending | generating | completed | failed`
- `attempts`: quantidade de tentativas
- `prompt`: briefing exclusivo do card
- `error`: causa da última falha

## State transitions

`pending → generating → completed`

`pending → generating → pending` em falha transitória com tentativas restantes.

`pending → generating → failed` quando as tentativas se esgotam.
