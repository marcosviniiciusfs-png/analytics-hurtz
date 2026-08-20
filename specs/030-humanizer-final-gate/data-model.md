# Data Model: Humanizer final

## HumanizerReport

- `approved`: indica se a copy final passou.
- `issues`: problemas detectados com campo, slide e regra.
- `attempted`: indica se houve revisão pelo modelo.
- `fallbackApplied`: indica se houve limpeza determinística.
- `protected`: indica que a copy foi preservada por contrato.
- `checkedAt`: data da validação.
- `version`: versão do conjunto de regras.

## HumanizerIssue

- `slideIndex`: índice do slide ou `null` para legenda.
- `field`: `title`, `body` ou `caption`.
- `rule`: identificador estável do padrão.
- `excerpt`: trecho curto usado no diagnóstico.

## State transitions

`draft` → `audited` → `repair-requested` → `verified` → `approved`

Em falha do modelo: `repair-requested` → `fallback-cleaned` → `verified`.

Em copy protegida: `draft` → `protected`.
