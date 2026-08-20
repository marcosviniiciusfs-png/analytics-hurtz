# Data Model: Isolamento de copy e formatos

## GenerationContext

- `id`: identificador único da execução.
- `createdAt`: instante de criação.
- `originalPrompt`: pedido integral recebido do usuário.
- `subject`: assunto interpretado, sempre derivado do pedido atual.
- `contentNotes`: fatos e detalhes de conteúdo do pedido atual.
- `visualDirectives`: instruções visuais separadas da copy.
- `personaSnapshot`: cópia dos dados de persona no início da execução.
- `format`: família normalizada.
- `layout`: estrutura escolhida.
- `composition`: composição escolhida.
- `count`: quantidade de slides.
- `referenceFingerprint`: identidade da referência, sem armazenar conteúdo duplicado.
- `pipelineVersion`: versão do contrato de geração.

### Validation

- `id`, `originalPrompt`, `subject`, `format` e `pipelineVersion` são obrigatórios.
- O contexto não pode ser alterado após criado.
- Respostas só podem ser aplicadas quando `id` corresponde à execução ativa.

## CopyCacheEntry

- `key`: assinatura composta.
- `prompt`: pedido integral usado para a chamada.
- `model`: modelo solicitado.
- `pipelineVersion`: versão do pipeline.
- `value`: resposta.
- `createdAt`: instante de armazenamento.

### Validation

- `get` só retorna quando prompt, modelo e versão coincidem integralmente.
- Entradas legadas sem metadados são ignoradas.
- Operações marcadas como `bypass` nunca leem nem escrevem no cache.

## FormatContract

- `id`: minimalista, profile, creators, techviral ou infinite.
- `template`: família de renderização.
- `layoutSequence`: variantes por papel e posição.
- `typography`: fontes e escalas permitidas.
- `palette`: cores-base e destaque.
- `metadata`: flags específicas, como badge ou continuidade.

### Validation

- Cada contrato possui assinatura distinta.
- Hook, Corpo e CTA são mapeados dentro da mesma família.
- Reparos mantêm o `id` do contrato original.

## State transitions

```text
created → strategy → humanize → audit → completed
              └──────── recovery ────────┘
any active state → superseded (quando outra execução começa)
```

Uma execução `superseded` pode terminar em segundo plano, mas não modifica o projeto atual.
