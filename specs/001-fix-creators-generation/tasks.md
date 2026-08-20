# Tasks: Corrigir geração Creators

## Phase 1: Setup

- [x] T001 Registrar o teste Creators no comando de validação em Hurtz Flow Studio/package.json

## Phase 2: Foundational

- [x] T002 Criar teste E2E inicialmente falho para diversidade e fila de imagens em Hurtz Flow Studio/scripts/creators-generation-e2e-test.js

## Phase 3: User Story 1 - Ritmo visual Creators (P1)

**Independent Test**: Cinco slides possuem Hook/Corpo/CTA e ao menos três assinaturas distintas.

- [x] T003 [US1] Centralizar variantes Creators por papel narrativo em Hurtz Flow Studio/app.js
- [x] T004 [US1] Aplicar geometrias e hierarquias distintas das variantes Creators em Hurtz Flow Studio/app.js

## Phase 4: User Story 2 - Imagens automáticas (P1)

**Independent Test**: Provedor simulado conclui e aplica todas as imagens elegíveis, com progresso correto.

- [x] T005 [US2] Centralizar elegibilidade e estados de mídia por slide em Hurtz Flow Studio/app.js
- [x] T006 [US2] Vincular a fila ao projeto atual e iniciar a geração após a copy em Hurtz Flow Studio/app.js
- [x] T007 [US2] Corrigir progresso, falhas recuperáveis e retentativa seletiva em Hurtz Flow Studio/app.js

## Phase 5: User Story 3 - Briefing específico (P2)

**Independent Test**: Cada prompt usa a copy e papel do card e proíbe texto incorporado.

- [x] T008 [US3] Validar briefings exclusivos e sem texto no teste Hurtz Flow Studio/scripts/creators-generation-e2e-test.js
- [x] T009 [US3] Garantir contexto isolado por card no pipeline de imagem em Hurtz Flow Studio/app.js

## Phase 6: Polish & Validation

- [x] T010 Executar teste dedicado e suíte completa em Hurtz Flow Studio/package.json
- [x] T011 Validar cenários do quickstart em specs/001-fix-creators-generation/quickstart.md
- [x] T012 Atualizar versão, gerar pacote Windows e validar instalação em Hurtz Flow Studio/package.json

## Dependencies & Execution Order

- T001 precede T002.
- T002 precede T003–T009.
- T003 e T004 precedem a validação final de US1.
- T005 precede T006 e T007.
- T008 precede T009.
- T010–T012 dependem de todas as histórias.

## Implementation Strategy

O MVP reúne US1 e US2 porque um Creators visualmente variado, mas sem mídia, continua incompleto. US3 reforça a qualidade sem alterar o contrato de edição.
