# Research: Corrigir geração Creators

## Decisão 1 — Variantes por função narrativa

**Decision**: Resolver variantes Creators por `role` e por posição do corpo, com Hook e CTA exclusivos e rotação determinística no corpo.

**Rationale**: A implementação atual alterna apenas duas opções por paridade e pode transformar quase todos os slides em títulos de capa quando não há imagem pronta.

**Alternatives considered**: Sorteio aleatório foi rejeitado por dificultar testes e repetir combinações; uma única composição adaptativa foi rejeitada por manter o defeito visual.

## Decisão 2 — Elegibilidade explícita de mídia

**Decision**: Um helper único define se o slide exige imagem conforme composição/layout; contador, fila e progresso usam o mesmo helper.

**Rationale**: Hoje o pipeline conta todo slide sem `image`, mesmo quando a estrutura não requer mídia, e a variável de disponibilidade calculada na criação não conduz explicitamente a fila.

**Alternatives considered**: Contar todos os slides foi rejeitado por gerar pendências falsas; iniciar jobs dentro de cada render foi rejeitado por permitir duplicidade.

## Decisão 3 — Fila ligada ao projeto

**Decision**: Capturar um identificador/assinatura da geração e validar o alvo antes de aplicar cada resultado.

**Rationale**: Jobs longos podem terminar após troca de projeto ou regeneração, aplicando mídia ao estado incorreto.

**Alternatives considered**: Bloquear o editor até terminar foi rejeitado porque prejudica desempenho e experiência.

## Decisão 4 — Teste com provedor simulado

**Decision**: O E2E substitui o gerador por uma resposta de imagem válida e verifica chamadas, estados e aplicação.

**Rationale**: Valida o pipeline do aplicativo sem depender de GPU, quota ou rede, enquanto testes manuais continuam cobrindo o motor real.

**Alternatives considered**: Testar apenas funções isoladas não detectaria o defeito de agendamento observado na interface.
