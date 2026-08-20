# Convergência — isolamento e fallback de imagens Cloudflare

## Resultado

- Contrato principal e fallback não enviam `seed`.
- Direções visuais numeradas são separadas e associadas ao slide correto.
- Copy, direção exclusiva, cena física, fingerprint e auditoria permanecem vinculados ao mesmo slide.
- Prompts respeitam o limite de 2048 caracteres e preservam isolamento e proibição de texto no início e no final.
- As quatro candidatas são pontuadas; a primeira aprovada é usada e, sem aprovação integral, a melhor pontuação é aplicada com `needsReview`.
- A copy literal não é enviada ao gerador; permanece disponível apenas para a auditoria semântica.
- Imagens aprovadas ou escolhidas como último recurso são persistidas fora do `localStorage`.

## Evidências executadas

- `node scripts/cloudflare-image-service-test.js`
- `node scripts/cloudflare-image-pipeline-e2e-test.js`
- `node scripts/cloudflare-carousel-live-e2e-test.js --prompts-only`
- `node scripts/pseudotext-last-resort-e2e-test.js`
- `npm test` — 90 controles vinculados
- Build portátil 1.60.7 gerado com sucesso.

## Trabalho restante

- Nenhum requisito funcional pendente para esta regra. A qualidade final de uma candidata marcada com `needsReview` continua dependente da revisão humana, conforme solicitado.
