# Implementation Plan: Ferramentas do editor sem travamentos

## Summary

Instrumentar o editor com Playwright, reproduzir arrastes e interações reais, identificar trabalhos síncronos e renderizações globais, e substituir essas rotas por atualizações isoladas do card ativo com consolidação apenas no fim da interação.

## Technical Context

- **Language/Version**: JavaScript CommonJS, Electron 39, Canvas 2D
- **Testing**: Playwright Electron, testes E2E existentes e smoke test
- **Files in scope**: `app.js`, `product-ui.css`, `tests/playwright/`, `package.json`
- **Performance Goals**: p95 até 50 ms, máximo 150 ms, scroll até 100 ms, zero repaint de cards inativos
- **Constraints**: preservar todos os controles, exportação 1080×1350 e layouts existentes

## Constitution Check

A constituição local continua como template. O fluxo Spec Kit obrigatório será executado com teste antes da correção, análise cruzada e convergência.

## Design Decisions

1. O Playwright dirigirá a interface real do Electron, não chamadas internas isoladas.
2. Inputs contínuos atualizarão apenas estado e canvas ativo em `requestAnimationFrame`.
3. Persistência, snapshots e miniaturas serão consolidados em `change`, `pointerup` ou troca de seleção.
4. Listeners globais duplicados e cadeias de wrappers de `syncLayerControls` serão auditados e reduzidos quando forem a origem do custo.
5. Os testes registrarão duração, erros, long tasks, mutações de cards inativos e estabilidade de scroll.

## Project Structure

```text
Hurtz Flow Studio/
├── app.js
├── product-ui.css
├── package.json
└── tests/playwright/editor-tools-performance.spec.js

specs/024-editor-tools-performance/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── tasks.md
└── checklists/requirements.md
```

