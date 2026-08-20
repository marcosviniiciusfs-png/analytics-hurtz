# Tasks: Humanizer como validação final da copy

## Phase 1: Setup

- [x] T001 Registrar a versão do conjunto de regras Humanizer em `Hurtz Flow Studio/copy-engine.js`

## Phase 2: Foundational

- [x] T002 [P] Implementar análise localizada de padrões artificiais em `Hurtz Flow Studio/copy-engine.js`
- [x] T003 [P] Implementar limpeza determinística conservadora em `Hurtz Flow Studio/copy-engine.js`
- [x] T004 Criar teste de regressão do gate em `Hurtz Flow Studio/scripts/humanizer-final-gate-test.js`

## Phase 3: User Story 1 - Copy natural

- [x] T005 [US1] Fortalecer o prompt de revisão dirigida em `Hurtz Flow Studio/copy-engine.js`
- [x] T006 [US1] Integrar o gate depois da auditoria final em `Hurtz Flow Studio/app.js`
- [x] T007 [US1] Validar a resposta e aplicar fallback quando necessário em `Hurtz Flow Studio/app.js`
- [x] T008 [US1] Persistir o relatório da validação no estado em `Hurtz Flow Studio/app.js`

## Phase 4: User Story 2 - Copy protegida

- [x] T009 [US2] Impedir o gate de alterar os modos `exact` e `preserved` em `Hurtz Flow Studio/app.js`
- [x] T010 [US2] Cobrir preservação literal no teste `Hurtz Flow Studio/scripts/humanizer-final-gate-test.js`

## Phase 5: Polish and validation

- [x] T011 Executar testes do gate, smoke e copy explícita a partir de `Hurtz Flow Studio/package.json`
- [x] T012 Atualizar a versão e construir o executável em `Hurtz Flow Studio/package.json`
- [x] T013 Instalar e validar a versão instalada do Hurtz Flow Studio
- [x] T014 Executar convergência contra `specs/030-humanizer-final-gate/spec.md`

## Dependencies

- T002 e T003 dependem de T001.
- T005 a T008 dependem de T002 a T004.
- T009 e T010 dependem do gate integrado.
- T011 a T014 dependem de todas as histórias concluídas.

## Independent tests

- **US1**: o caso de regressão é detectado, reparado e aprovado sem perder a ideia.
- **US2**: uma copy marcada como exata permanece byte a byte igual.

## MVP

T001 a T010 entregam o comportamento funcional completo; T011 a T014 validam e empacotam.
