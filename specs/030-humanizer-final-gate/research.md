# Research: Humanizer final

## Decision: validar a saída, não confiar apenas no prompt

**Rationale**: O modelo local pode ignorar instruções ou retornar JSON inválido. Uma solicitação sem verificação não garante o resultado.

**Alternatives considered**: Uma única chamada de humanização foi rejeitada porque é exatamente o comportamento que produziu a regressão.

## Decision: executar depois da auditoria estrutural

**Rationale**: Reparos posteriores podem reintroduzir padrões removidos. A última etapa que altera o texto deve ser seguida pelo gate.

**Alternatives considered**: Manter a humanização apenas logo após o rascunho foi rejeitado.

## Decision: fallback conservador

**Rationale**: Travessões retóricos e expressões queimadas podem ser removidos sem inventar informações. Reescritas semânticas complexas continuam sendo responsabilidade do modelo.

**Alternatives considered**: Reescrever qualquer enumeração por regras fixas foi rejeitado por risco de alterar fatos.
