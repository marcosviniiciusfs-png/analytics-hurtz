# Implementation Plan: Congelar cards inativos no editor

## Summary

Substituir a reconstrução integral de miniaturas e cards vizinhos por um registro estável de snapshots leves. Durante edições contínuas, somente o canvas ativo será composto. A troca de seleção consolida uma vez o card anterior; operações estruturais reconstroem o registro sem afetar a renderização de exportação.

## Technical Context

- **Language/Version**: JavaScript no renderer Electron
- **Primary Dependencies**: Electron, Canvas 2D, DOM nativo
- **Storage**: Estado local já existente; nenhuma nova persistência de domínio
- **Testing**: scripts E2E via Chrome DevTools Protocol e smoke tests Node
- **Target Platform**: Windows desktop
- **Project Type**: Aplicativo desktop Electron
- **Performance Goals**: zero pintura de card inativo durante 100 inputs; latência de scroll menor que 50 ms; snapshot inativo em escala máxima de 0,4
- **Constraints**: preservar exportação 1080×1350, carrossel infinito, modelo de IA e ferramentas existentes

## Constitution Check

A constituição local ainda é um template sem princípios preenchidos. As regras do AGENTS.md são atendidas pelo fluxo Spec Kit, implementação orientada por teste e convergência final.

## Project Structure

```text
Hurtz Flow Studio/
├── app.js
├── product-ui.css
├── package.json
└── scripts/
    └── inactive-card-freeze-e2e-test.js

specs/022-freeze-inactive-editor-cards/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── tasks.md
└── checklists/requirements.md
```

## Design Decisions

1. **Snapshots estáveis por ID de slide**: miniaturas e previews mantêm a mesma instância DOM enquanto a estrutura não muda.
2. **Preview leve**: snapshots usam escala de 0,3–0,4 e nunca são fonte da exportação.
3. **Invalidação por transição**: edição contínua marca o card ativo como sujo, mas só consolida o snapshot quando ele deixa de ser ativo.
4. **Estrutura separada de pintura**: adicionar, duplicar, excluir ou reordenar reconcilia nós; mudanças visuais não reconstroem a lista.
5. **Métricas observáveis**: contadores permitem provar que cards inativos permaneceram congelados.

## Implementation Phases

1. Criar teste E2E que reproduz o custo e falha sem congelamento.
2. Implementar o registro de snapshots e a reconciliação da lista lateral.
3. Implementar a faixa de previews congelados, incluindo o modo infinito e rótulos do modelo.
4. Integrar seleção, edição contínua e operações estruturais.
5. Validar Fundo do slide, Sombra/Overlay, scroll, duplicação, exclusão e exportação.
6. Gerar e instalar a versão desktop validada.

