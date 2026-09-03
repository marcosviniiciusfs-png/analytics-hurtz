# Implementation Plan: Corrigir geração real do Cloudflare

1. Manter `seed` fora do adaptador, da normalização, do cache e dos payloads principal e fallback.
2. Separar a direção global das direções numeradas por slide e persistir a orientação exclusiva no respectivo slide.
3. Fazer interpretação, prompt, auditoria e fingerprint consumirem o contexto isolado do slide.
4. Estender os testes com cinco direções deliberadamente diferentes e bloquear vazamento entre prompts.
5. Executar regressões controladas, construir e instalar a nova versão.
6. Persistir imagens aprovadas em arquivos locais, executar um carrossel real com cinco imagens, confirmar sua visibilidade e salvar o projeto de validação no dashboard.

7. Garantir identificadores únicos antes de formar a fila, isolar falhas por tentativa e fazer o retry reconstruir apenas os alvos pendentes sem depender de índices mutáveis.
8. Validar o cenário exato de uma imagem concluída e quatro pendentes no código-fonte e no executável instalado.

## Files in Scope

- `Hurtz Flow Studio/app.js`
- `Hurtz Flow Studio/main.js`
- `Hurtz Flow Studio/preload.js`
- `Hurtz Flow Studio/cloudflare-image-service.js`
- `Hurtz Flow Studio/supabase-sync.js`
- `Hurtz Flow Studio/scripts/cloudflare-image-service-test.js`
- `Hurtz Flow Studio/scripts/cloudflare-carousel-live-e2e-test.js`
- `Hurtz Flow Studio/scripts/cloudflare-image-pipeline-e2e-test.js`
- `Hurtz Flow Studio/scripts/cloudflare-queue-retry-e2e-test.js`
- `Hurtz Flow Studio/package.json`
