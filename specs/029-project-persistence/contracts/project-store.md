# Contract: Project store IPC

## `project-store-load-sync`

Retorna `{ ok, store }`. Em corrupção retorna store vazio válido e registra o erro.

## `project-store-save`

Valida, grava atomicamente e retorna `{ ok, revision, savedAt }` após releitura.

## `project-store-save-sync`

Mesmo contrato, reservado ao fechamento e confirmação explícita.

## Garantias

- O caminho é definido pelo processo principal.
- Revisão antiga não sobrescreve nova.
- `ok: true` significa arquivo final relido e válido.
