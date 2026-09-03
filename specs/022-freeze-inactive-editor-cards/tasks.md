# Tasks: Congelar cards inativos no editor

## Phase 1: Testes de regressão

- [x] T001 Criar teste E2E inicialmente falho para congelamento, latência de scroll e troca de seleção em `Hurtz Flow Studio/scripts/inactive-card-freeze-e2e-test.js`

## Phase 2: Implementação principal

- [x] T002 Implementar registro de snapshots estáveis e métricas em `Hurtz Flow Studio/app.js`
- [x] T003 Substituir reconstrução integral da lista lateral por reconciliação incremental e preview leve em `Hurtz Flow Studio/app.js`
- [x] T004 Substituir reconstrução dos cards vizinhos por snapshots congelados, preservando infinito e rótulos do modelo em `Hurtz Flow Studio/app.js`
- [x] T005 Integrar invalidação com edição contínua, seleção e operações estruturais em `Hurtz Flow Studio/app.js`

## Phase 3: Validação e entrega

- [x] T006 Validar Fundo do slide, Sombra/Overlay, scroll e seleção com os testes E2E existentes
- [x] T007 Validar smoke test e exportação sem perda de resolução
- [x] T008 Atualizar versão, gerar o executável e instalar a compilação validada
