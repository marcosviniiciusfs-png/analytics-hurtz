# Validation: Isolamento de copy e formatos

**Date**: 2026-08-16  
**Version**: 1.60.14  
**Result**: Approved

## Outcomes

- Cache de copy validado pelo prompt integral, modelo, versão do pipeline e finalidade.
- Chamadas criativas principais usam bypass de cache e identificador próprio da execução.
- Resposta de uma execução superada não pode substituir o projeto da execução mais recente.
- Recuperação recebe o prompt original completo e o fallback deixou de usar o catálogo genérico fixo.
- Minimalista, Profile, Creators, TechViral e Infinito preservam metadados, variantes, paleta e tipografia próprios.
- Copy explícita continua literal; persistência, editor e exportação permanecem funcionais.

## Automated evidence

- `copy-context-isolation-test.js`: approved.
- `copy-context-isolation-e2e-test.js`: 20 temas distintos, 20 resultados exclusivos, sem vazamento.
- `generation-context-e2e-test.js`: duas gerações sequenciais incompatíveis, sem contaminação e com formatos preservados.
- `format-contract-matrix-e2e-test.js`: cinco formatos, cinco assinaturas distintas, cinco variantes por família.
- `copy-error-containment-test.js`: approved.
- `explicit-copy-e2e-test.js`: seis slides preservados literalmente; nenhuma chamada ao modelo.
- `text-first-structures-e2e-test.js`: approved.
- `project-persistence.spec.js`: 2/2 approved, sem regeneração ao restaurar.
- `editor-tools-performance.spec.js`: 91 controles exercitados; cards inativos permaneceram congelados.
- `zip-export-immutable-e2e-test.js`: ZIP não chamou auditoria, não reescreveu copy e preservou o estado.
- `npm test`: smoke test approved, 90 controles vinculados.

## Packaged application

- Portable build: `Hurtz Flow Studio/release/Hurtz Flow Studio 1.60.14.exe`.
- Installed app updated at `C:/Users/Brito/AppData/Local/Programs/Hurtz Flow Studio/`.
- Source and installed `app.asar` SHA-256 matched after installation.
- Generation isolation, format matrix and immutable ZIP tests passed against the installed executable.

## Convergence

All functional requirements FR-001 through FR-012 and success criteria SC-001 through SC-005 have automated evidence. No remaining task was identified for this feature.
