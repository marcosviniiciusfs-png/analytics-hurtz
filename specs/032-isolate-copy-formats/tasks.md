# Tasks: Isolamento de copy e formatos

**Input**: Design documents from `/specs/032-isolate-copy-formats/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Solicitados pelo usuário e obrigatórios para reproduzir e validar a correção.

## Phase 1: Setup

- [x] T001 Registrar o baseline dos testes existentes e os pontos de sobrescrita do pipeline em `Hurtz Flow Studio/app.js`, `Hurtz Flow Studio/runtime-services.js` e `Hurtz Flow Studio/copy-engine.js`

---

## Phase 2: Foundational

- [x] T002 Criar testes inicialmente falhos para isolamento sequencial, colisão/validação de cache e fallback específico em `Hurtz Flow Studio/scripts/copy-context-isolation-test.js`
- [x] T003 Criar teste inicialmente falho da matriz Minimalista/Profile/Creators/TechViral/Infinito e preservação após auditoria em `Hurtz Flow Studio/scripts/format-contract-matrix-e2e-test.js`

**Checkpoint**: As regressões devem estar reproduzidas antes da implementação.

---

## Phase 3: User Story 1 - Gerar conteúdo sem contaminação anterior (Priority: P1)

**Goal**: Garantir que cada nova geração use apenas o pedido e as opções atuais.

**Independent Test**: Duas gerações sequenciais com temas incompatíveis não compartilham frases, contexto, rascunho nem cache.

- [x] T004 [US1] Implementar entradas de cache validadas por conteúdo integral, modelo e versão em `Hurtz Flow Studio/runtime-services.js`
- [x] T005 [US1] Criar e aplicar o snapshot imutável da execução e a política bypass/validated em `Hurtz Flow Studio/app.js`
- [x] T006 [US1] Impedir que resultados de execução superada alterem o projeto ativo em `Hurtz Flow Studio/app.js`
- [x] T007 [US1] Executar e aprovar `Hurtz Flow Studio/scripts/copy-context-isolation-test.js`

---

## Phase 4: User Story 2 - Respeitar a identidade de cada formato (Priority: P1)

**Goal**: Fazer a escolha explícita de formato prevalecer e manter cinco contratos distintos.

**Independent Test**: A mesma copy gera cinco assinaturas estruturais diferentes, inclusive depois de reconstrução e auditoria.

- [x] T008 [US2] Centralizar contratos de formato e normalização da escolha atual em `Hurtz Flow Studio/app.js`
- [x] T009 [US2] Fazer reconstrução, recuperação e auditoria preservarem o contrato atual em `Hurtz Flow Studio/app.js`
- [x] T010 [US2] Executar e aprovar `Hurtz Flow Studio/scripts/format-contract-matrix-e2e-test.js` e `Hurtz Flow Studio/scripts/text-first-structures-e2e-test.js`

---

## Phase 5: User Story 3 - Recuperar falhas sem copy genérica (Priority: P2)

**Goal**: Entregar um roteiro específico mesmo quando o modelo local falha.

**Independent Test**: Resposta vazia, inválida ou contaminada produz Hook–Corpo–CTA ancorado no pedido atual, sem frases fixas genéricas.

- [x] T011 [US3] Substituir o catálogo determinístico genérico por fallback derivado das linhas e fatos do pedido atual em `Hurtz Flow Studio/app.js`
- [x] T012 [US3] Vincular estratégia, humanização, auditoria e recuperação ao assunto integral da execução em `Hurtz Flow Studio/app.js` e `Hurtz Flow Studio/copy-engine.js`
- [x] T013 [US3] Aprovar cenários de falha e contenção em `Hurtz Flow Studio/scripts/copy-context-isolation-test.js` e `Hurtz Flow Studio/scripts/copy-error-containment-test.js`

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T014 Executar regressões de copy explícita, persistência, editor e exportação nos scripts existentes de `Hurtz Flow Studio/scripts/`
- [x] T015 Atualizar versão, construir instalador e validar a aplicação instalada em `Hurtz Flow Studio/package.json` e `Hurtz Flow Studio/release/`
- [x] T016 Executar o roteiro completo de `specs/032-isolate-copy-formats/quickstart.md` e registrar os resultados em `specs/032-isolate-copy-formats/validation.md`

---

## Dependencies & Execution Order

- T001 antecede T002 e T003.
- T002 antecede T004–T007 e T011–T013.
- T003 antecede T008–T010.
- T014 depende de todas as histórias.
- T015 depende de T014.
- T016 depende de T015.

## Implementation Strategy

1. Reproduzir isolamento e formato com testes falhos.
2. Corrigir isolamento de contexto e cache.
3. Corrigir contratos de formato sem redesenhar o editor.
4. Corrigir fallback genérico.
5. Executar regressões, empacotar, instalar e validar.
