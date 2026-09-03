# Convergência: Pseudotexto como último recurso

**Status**: Convergente  
**Versão validada**: 1.60.0

## Resultado

- A copy literal do título e do corpo não é enviada ao gerador de imagem; o prompt usa apenas a interpretação física da cena.
- As quatro tentativas normais continuam reprovando texto e pseudotexto.
- Somente a quarta candidata pode ser usada como último recurso, e apenas quando pseudotexto for sua única falha.
- A imagem de último recurso é aplicada com OCR preservado, `needsReview: true` e aviso explícito.
- Colagem, repetição, desconexão semântica, anatomia defeituosa e erro de contrato continuam bloqueantes.

## Evidências

- `node scripts/pseudotext-last-resort-e2e-test.js`: aprovado.
- `node scripts/carousel-image-generation-e2e-test.js`: 5/5 imagens e retry aprovado.
- `node scripts/cloudflare-image-service-test.js`: contratos de primary, cache, fallback e erro aprovados.
- `npm test`: smoke test com 90 controles aprovado.
- `node scripts/pseudotext-last-resort-e2e-test.js --installed`: aprovado no executável.
- `node scripts/carousel-image-generation-e2e-test.js --installed`: 5/5 aprovado no executável.

## Trabalho restante

Nenhum requisito desta especificação ficou pendente.
