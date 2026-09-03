# Tasks: Ferramentas do editor sem travamentos

## Phase 1: Diagnóstico e teste falho

- [x] T001 [US1] Criar auditoria Playwright de todas as famílias de ferramentas em `Hurtz Flow Studio/tests/playwright/editor-tools-performance.spec.js`
- [x] T002 [US1] Executar a auditoria e registrar gargalos em `specs/024-editor-tools-performance/research.md`

## Phase 2: Isolamento do card ativo

- [x] T003 [US1] Corrigir rotas de input contínuo e renderização isolada em `Hurtz Flow Studio/app.js`
- [x] T004 [US1] Corrigir Fundo do slide, Sombra/Overlay, tipografia, posição, imagem e cantos em `Hurtz Flow Studio/app.js`
- [x] T005 [US2] Preservar scroll e estados de interação dos controles em `Hurtz Flow Studio/product-ui.css` e `Hurtz Flow Studio/app.js`

## Phase 3: Regressão e desempenho

- [x] T006 [US2] Validar troca de card, cards inativos e 100 inputs no teste Playwright
- [x] T007 Executar suítes de editor existentes e smoke test em `Hurtz Flow Studio/scripts/`
- [x] T008 Atualizar a documentação de resultados e concluir convergência em `specs/024-editor-tools-performance/`
