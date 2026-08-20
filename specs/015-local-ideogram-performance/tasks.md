# Tasks: Ideogram 4 local com diagnóstico de desempenho

## Phase 1: Setup

- [x] T001 [US1] Clonar e fixar o repositório oficial em `ferramentas/ideogram4`.
- [x] T002 [US1] Criar probe de hardware, dependências, autenticação e pesos em `Hurtz Flow Studio/scripts/ideogram-local-worker.py`.

## Phase 2: Foundational

- [x] T003 [US1] Criar worker persistente com protocolo JSON e telemetria em `Hurtz Flow Studio/scripts/ideogram-local-worker.py`.
- [x] T004 [US1] Implementar modo NF4 de baixa VRAM e preset Turbo documentado em `ferramentas/ideogram4`.
- [x] T005 [US2] Integrar lifecycle, cancelamento e eventos do worker em `Hurtz Flow Studio/main.js` e `preload.js`.

## Phase 3: Local generation

- [x] T006 [US1] Tornar Ideogram 4 local o provedor principal e preservar fallback real em `Hurtz Flow Studio/app.js`.
- [x] T007 [US1] Persistir proveniência, modelo real e causa de fallback por slide em `Hurtz Flow Studio/app.js`.
- [x] T008 [US2] Instrumentar preparação, carregamento, inferência, auditoria e persistência em `Hurtz Flow Studio/app.js`.

## Phase 4: Model labels and diagnostics

- [x] T009 [US3] Renderizar rótulo externo do modelo no canto superior direito de cada card em `Hurtz Flow Studio/app.js`.
- [x] T010 [US3] Estilizar o rótulo e estado de diagnóstico em `Hurtz Flow Studio/product-ui.css`.
- [x] T011 [US2] Exibir tempo decorrido e fase sem manter a barra em 0% em `Hurtz Flow Studio/app.js`.

## Phase 5: Validation

- [x] T012 [US1] Criar teste de contrato do probe, worker, fallback e modelo real.
- [x] T013 [US2] Criar teste E2E de tempos, heartbeat e responsividade.
- [x] T014 [US3] Criar teste E2E de rótulos em imagens locais, fallback, manual e ausente.
- [x] T015 Executar suíte completa, analisar convergência, empacotar, instalar e validar o launcher.

## Dependencies & Execution Order

- [x] T016 Corrigir a incompatibilidade real entre NF4, Diffusers e `device_map=balanced`, fixar as versÃµes oficiais e trocar para offload sequencial por componente em GPUs de 8 GB.

- T001 precede T002–T004.
- T003–T005 precedem T006–T008.
- T007 precede T009.
- T006–T011 precedem os testes T012–T014.
- T015 encerra a feature.
