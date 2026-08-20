# Tasks: Fluxo gratuito assistido do Ideogram

## Phase 1: Setup

- [x] T001 Criar o módulo isolado do monitor em `Hurtz Flow Studio/scripts/ideogram-download-watcher.js`.
- [x] T002 [P] Registrar o fluxo gratuito na suíte e versão em `Hurtz Flow Studio/package.json`.

## Phase 2: Foundational

- [x] T003 Criar testes de estabilidade, formato, data e cancelamento em `Hurtz Flow Studio/scripts/ideogram-download-watcher-test.js`.
- [x] T004 Implementar IPC seguro de iniciar/cancelar monitor, abrir site e encerrar sessão em `Hurtz Flow Studio/main.js`.
- [x] T005 Expor somente o contrato necessário em `Hurtz Flow Studio/preload.js`.

## Phase 3: User Story 1 - Gerar e importar uma imagem (P1)

**Independent Test**: um download novo e estável é aplicado ao slide que iniciou a sessão.

- [x] T006 [US1] Garantir IDs estáveis e preparar prompt individual sem texto em `Hurtz Flow Studio/app.js`.
- [x] T007 [US1] Implementar diálogo com revisão, cópia, abertura, estados e cancelamento em `Hurtz Flow Studio/app.js`.
- [x] T008 [US1] Aplicar o evento de download ao slide por ID e persistir procedência em `Hurtz Flow Studio/app.js`.
- [x] T009 [US1] Estilizar o diálogo e seus estados acessíveis em `Hurtz Flow Studio/product-ui.css`.

## Phase 4: User Story 2 - Fila guiada de slides (P1)

**Independent Test**: após uma importação, o próximo slide pendente é apresentado sem iniciar IA local.

- [x] T010 [US2] Substituir a fila automática pesada por fila assistida e inativa até ação do usuário em `Hurtz Flow Studio/app.js`.
- [x] T011 [US2] Atualizar o indicador do editor com quantidade, slide atual e ação de continuar em `Hurtz Flow Studio/app.js` e `Hurtz Flow Studio/product-ui.css`.

## Phase 5: User Story 3 - Recuperar falhas (P2)

**Independent Test**: cancelamento impede importação tardia e seleção manual conclui o slide alvo.

- [x] T012 [US3] Integrar seleção manual ao slide da sessão e estados de erro/tentativa em `Hurtz Flow Studio/app.js`.
- [x] T013 [US3] Cancelar sessão ao apagar slide, iniciar outra sessão ou fechar app em `Hurtz Flow Studio/app.js` e `Hurtz Flow Studio/main.js`.

## Phase 6: Validation and delivery

- [x] T014 Criar contrato E2E do fluxo e da ausência de geração local automática em `Hurtz Flow Studio/scripts/ideogram-web-assisted-e2e-test.js`.
- [ ] T015 Executar a suíte completa e a validação descrita em `specs/016-ideogram-free-assisted/quickstart.md`.
- [x] T016 Executar convergência, gerar instalador e atualizar o launcher do Hurtz Flow Studio.

## Dependencies & Execution Order

- T001 precede T003 e T004.
- T004 precede T005.
- T005–T009 precedem T010–T013.
- T003 e T006 podem ser executadas sem conflito.
- T014 precede T015; T015 precede T016.

## Implementation Strategy

O MVP é T001–T009. A fila e os fallbacks são adicionados depois sem alterar o contrato do monitor. A implementação não remove o motor local instalado, mas o fluxo gratuito não o invoca.

## Phase 7: Convergence — orientação e modal

- [x] T017 [US1] Reescrever o prompt por slide integralmente em português em `Hurtz Flow Studio/app.js`.
- [x] T018 [US1] Criar passo a passo numerado, prompt recolhível e ação direta no modal em `Hurtz Flow Studio/app.js`.
- [x] T019 [US1] Abrir diretamente o painel oficial do gerador em `Hurtz Flow Studio/main.js`.
- [x] T020 [US1] Corrigir hierarquia, rolagem e responsividade do modal em `Hurtz Flow Studio/product-ui.css`.
- [x] T021 [US1] Atualizar o contrato de regressão do fluxo guiado em `Hurtz Flow Studio/scripts/ideogram-web-assisted-e2e-test.js`.
- [x] T022 Validar, convergir, empacotar e atualizar o launcher com a correção.
