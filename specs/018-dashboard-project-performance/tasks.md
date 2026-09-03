# Tasks: Projetos instantâneos e exclusão confiável

- [x] T001 Criar contrato e utilitários de capa leve no `app.js`.
- [x] T002 Renderizar cards com prévia imediata e migração ociosa de projetos antigos.
- [x] T003 Centralizar confirmação, bloqueio de clique duplo, tombstone e exclusão otimista.
- [x] T004 Transformar a sincronização Supabase em carregamento progressivo sem sobrescrever eventos.
- [x] T005 Adicionar regressão E2E para capa imediata, exclusão e tombstone.
- [x] T006 Executar suíte completa, análise de convergência, build e instalação.

## Convergence

- 2026-08-13: FR-001–FR-011 comparados com a implementação e todos cobertos.
- E2E do fonte e do executável instalado aprovados: capa em 5,5 ms, uma única chamada no clique duplo e tombstone preservado durante falha remota.
- Regressões de layout, editor, exclusão local e smoke test aprovadas.
