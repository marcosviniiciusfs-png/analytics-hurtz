# Data Model: Recuperação segura de copy

## CopyRecoveryReport

- `code`: código neutro da falha inicial.
- `attempts`: quantidade de tentativas executadas.
- `fallbackApplied`: indica uso do rascunho seguro.
- `diagnosticLeakRejected`: indica que uma resposta contaminada foi rejeitada.
- `originalTopic`: assunto editorial preservado.
- `userMessage`: aviso amigável separado da copy.

## CopyCandidate

- `slides`: títulos, corpos e papéis dos slides.
- `caption`: legenda opcional.
- `hashtags`: hashtags opcionais.
- `source`: primeira geração, recuperação ou fallback determinístico.
- `valid`: resultado combinado das validações.

## State transitions

1. `requested` → `initial_generation`
2. `initial_generation` → `validated` ou `recovery`
3. `recovery` → `validated`, nova `recovery` ou `safe_fallback`
4. `validated`/`safe_fallback` → `committed`
5. Nenhum estado inválido pode transicionar para `committed`.
