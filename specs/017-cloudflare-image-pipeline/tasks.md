# Tasks: Pipeline gratuito de imagens Cloudflare

## Phase 1: Setup

- [x] T001 Criar serviço isolado em `Hurtz Flow Studio/cloudflare-image-service.js`.
- [x] T002 Registrar arquivos e testes em `Hurtz Flow Studio/package.json`.

## Phase 2: Foundational

- [x] T003 [P] Criar testes de contrato, fallback, cache e erros em `Hurtz Flow Studio/scripts/cloudflare-image-service-test.js`.
- [x] T004 Integrar armazenamento seguro e IPC em `Hurtz Flow Studio/main.js`.
- [x] T005 Expor contrato mínimo em `Hurtz Flow Studio/preload.js`.

## Phase 3: User Story 1 - Configuração segura

- [x] T006 [US1] Criar painel de configuração e estados em `Hurtz Flow Studio/app.js`.
- [x] T007 [US1] Aplicar hierarquia, feedback e responsividade em `Hurtz Flow Studio/product-ui.css`.

## Phase 4: User Story 2 - Geração automática

- [x] T008 [US2] Conectar geração principal e procedência por slide em `Hurtz Flow Studio/app.js`.
- [x] T009 [US2] Implementar fila progressiva, cancelamento lógico e aplicação por ID em `Hurtz Flow Studio/app.js`.
- [x] T010 [US2] Integrar auditoria objetiva e semântica antes da aplicação em `Hurtz Flow Studio/app.js`.

## Phase 5: User Story 3 - Recuperação e economia

- [x] T011 [US3] Integrar cache, fallback finito e mensagens acionáveis em `Hurtz Flow Studio/cloudflare-image-service.js` e `Hurtz Flow Studio/app.js`.
- [x] T012 [US3] Preservar Ideogram assistido e upload como alternativas explícitas em `Hurtz Flow Studio/app.js`.

## Phase 6: Validation

- [x] T013 Criar regressão E2E do pipeline em `Hurtz Flow Studio/scripts/cloudflare-image-pipeline-e2e-test.js`.
- [x] T014 Executar análise de artefatos, suíte completa, convergência e empacotamento.

## Convergence

- 2026-08-13: implementação comparada com FR-001–FR-020; nenhum requisito funcional pendente no código.
- Validação externa real depende apenas de o usuário fornecer Account ID e API Token válidos dentro do painel seguro do aplicativo.

## Dependencies

- T001 precede T003–T005 e T011.
- T004 precede T005–T010.
- T006–T010 precedem T013.
- T013 precede T014.

## Phase 7: Correção urgente do salvamento

- [x] T015 Corrigir a colisão entre o salvamento Cloudflare e a sincronização Supabase, validar persistência, estado verde, limpeza dos campos e mensagem de segurança conforme FR-021 e SC-009.
