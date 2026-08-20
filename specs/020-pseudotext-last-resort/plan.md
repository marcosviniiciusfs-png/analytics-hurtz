# Implementation Plan: Pseudotexto como último recurso

1. Separar razões de reprovação textual das razões estruturais e semânticas.
2. Considerar elegível somente a quarta candidata cuja única falha seja pseudotexto.
3. Após as quatro tentativas, aceitar a quarta candidata com `needsReview`, OCR e motivo explícito.
4. Adicionar regressão automatizada cobrindo quatro tentativas e rejeições duras.
5. Construir, instalar e validar no executável.

## Files in Scope

- `Hurtz Flow Studio/app.js`
- `Hurtz Flow Studio/scripts/pseudotext-last-resort-e2e-test.js`
- `Hurtz Flow Studio/scripts/carousel-image-generation-e2e-test.js`
- `Hurtz Flow Studio/package.json`
