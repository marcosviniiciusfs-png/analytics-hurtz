# Tasks: Conter falhas internas da geração de copy

## Phase 1: Setup

- [x] T001 Registrar o contrato de recuperação segura em `specs/031-copy-error-containment/contracts/copy-recovery.md`

## Phase 2: Foundational

- [x] T002 [P] Criar teste determinístico de classificação em `Hurtz Flow Studio/scripts/copy-error-containment-test.js`
- [x] T003 [P] Criar teste Electron do fluxo completo em `Hurtz Flow Studio/tests/playwright/copy-error-containment.spec.js`
- [x] T004 Adicionar comando de teste em `Hurtz Flow Studio/package.json`

## Phase 3: User Story 1 - Conteúdo fiel ao assunto

- [x] T005 [US1] Implementar classificação contextual de diagnóstico interno em `Hurtz Flow Studio/copy-engine.js` e aplicá-la em `Hurtz Flow Studio/app.js`
- [x] T006 [US1] Remover exceções brutas e candidatos contaminados do prompt de recuperação em `Hurtz Flow Studio/app.js`
- [x] T007 [US1] Fortalecer a validação temática e de contaminação em `Hurtz Flow Studio/app.js`
- [x] T008 [US1] Implementar fallback determinístico livre de diagnóstico em `Hurtz Flow Studio/app.js`
- [x] T009 [US1] Aplicar a nova geração ao estado somente depois da validação em `Hurtz Flow Studio/app.js`

## Phase 4: User Story 2 - Diagnóstico separado da copy

- [x] T010 [US2] Persistir relatório neutro de recuperação no estado em `Hurtz Flow Studio/app.js`
- [x] T011 [US2] Impedir respostas inválidas de entrarem no cache em `Hurtz Flow Studio/runtime-services.js` e `Hurtz Flow Studio/app.js`
- [x] T012 [US2] Cobrir tema técnico intencional nos testes em `Hurtz Flow Studio/scripts/copy-error-containment-test.js`

## Phase 5: Polish and validation

- [x] T013 Executar testes de copy, Humanizer, smoke e Playwright a partir de `Hurtz Flow Studio/package.json`
- [x] T014 Atualizar versão e construir o executável em `Hurtz Flow Studio/package.json`
- [x] T015 Instalar e validar a versão empacotada do Hurtz Flow Studio
- [x] T016 Executar convergência contra `specs/031-copy-error-containment/spec.md`

## Dependencies

- T002 e T003 definem os casos de regressão antes de T005 a T012.
- T005 a T008 bloqueiam T009 a T012.
- T013 a T016 dependem das histórias concluídas.

## Independent tests

- **US1**: uma resposta vazia seguida por roteiro sobre backend nunca aparece nos slides de um tema não técnico.
- **US2**: o relatório registra recuperação, e um pedido realmente técnico continua aceito.

## MVP

T001 a T009 eliminam o defeito observado; T010 a T016 completam observabilidade, cache, empacotamento e validação.
