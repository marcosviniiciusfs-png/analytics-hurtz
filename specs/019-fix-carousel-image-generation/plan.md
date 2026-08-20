# Implementation Plan: Correção da geração de imagens

## Technical Context

- Aplicativo desktop Electron com renderer em `Hurtz Flow Studio/app.js`.
- Geração remota pelo serviço Cloudflare Workers AI existente.
- Auditorias objetiva e semântica executadas antes de aplicar a imagem ao slide.

## Implementation Strategy

1. Tornar explícito o contrato `semanticImageAudit(image, scene, previous, slide)` em todos os chamadores ativos.
2. Adicionar proteção defensiva para slide ausente, retornando resultado controlado em vez de lançar `TypeError`.
3. Tratar auditoria semântica indisponível como revisão pendente quando a auditoria objetiva aprovar a imagem.
4. Criar regressão automatizada de cinco slides que percorra fila e nova tentativa com ponte controlada.
5. Executar um teste integrado com o provedor Cloudflare configurado, gerar cinco imagens, construir e repetir no executável instalado.

## Files in Scope

- `Hurtz Flow Studio/app.js`
- `Hurtz Flow Studio/scripts/carousel-image-generation-e2e-test.js`
- `Hurtz Flow Studio/package.json`
- `specs/019-fix-carousel-image-generation/*`

## Validation

- Verificação estática de todos os chamadores da auditoria.
- Teste automatizado controlado 5/5.
- Teste real Cloudflare 5/5 ou relatório explícito de falha externa por slide.
- Smoke test, build e teste do executável instalado.
