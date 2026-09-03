# Implementation Plan: Isolamento de copy e formatos

**Branch**: `[032-isolate-copy-formats]` | **Date**: 2026-08-16 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/032-isolate-copy-formats/spec.md`

## Summary

Isolar cada execução de copy em um snapshot imutável, impedir reaproveitamento de cache sem correspondência integral, substituir o fallback genérico por uma recuperação derivada do pedido atual e centralizar a construção visual em contratos explícitos por formato. A correção será adicionada no pipeline existente com testes de regressão antes da alteração para não afetar editor, persistência, imagens ou exportação.

## Technical Context

**Language/Version**: JavaScript no renderer e processo principal do Electron 39

**Primary Dependencies**: Electron, Ollama local, Canvas 2D, Playwright

**Storage**: localStorage e persistência de projetos existente; cache local de copy

**Testing**: Node.js `assert`, testes Electron via CDP e Playwright já instalado

**Target Platform**: Windows desktop

**Project Type**: Aplicativo desktop Electron

**Performance Goals**: Nova geração não adiciona chamadas extras no caminho normal; alternância de formato e construção dos slides permanecem imediatas; cache só pode reduzir trabalho quando a entrada integral é idêntica e validada.

**Constraints**: Preservar worktree existente, copy explícita, editor, persistência, imagens e exportação; evitar reestruturação ampla do arquivo legado; geração local deve permanecer stateless.

**Scale/Scope**: Cinco famílias de formato, até dez slides por geração e dezenas de gerações armazenadas localmente.

## Constitution Check

O arquivo de constituição permanece como template sem princípios ratificados; a verificação normativa foi ignorada conforme as regras do Spec Kit. As regras do `AGENTS.md` são atendidas pelo fluxo Specify → Plan → Tasks → Analyze → Implement → Converge, com testes antes do código.

**Post-design check**: PASS. Não há violações ou exceções de complexidade.

## Project Structure

### Documentation (this feature)

```text
specs/032-isolate-copy-formats/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── generation-contract.md
├── checklists/
│   └── requirements.md
└── tasks.md
```

### Source Code (repository root)

```text
Hurtz Flow Studio/
├── app.js
├── copy-engine.js
├── runtime-services.js
├── package.json
└── scripts/
    ├── copy-context-isolation-test.js
    ├── format-contract-matrix-e2e-test.js
    ├── copy-error-containment-test.js
    ├── explicit-copy-e2e-test.js
    ├── project-persistence-e2e-test.js
    └── text-first-structures-e2e-test.js
```

**Structure Decision**: Manter o aplicativo Electron existente. A correção fica concentrada no pipeline de copy e contratos de formato; testes independentes cobrem o comportamento público sem migrar componentes do editor.

## Design

### Isolamento da execução

- Criar um contexto por geração com identificador novo e snapshot do pedido atual.
- Passar esse contexto para estratégia, humanização, auditoria e recuperação.
- Solicitações criativas principais ignoram cache entre execuções; operações auxiliares podem reutilizar apenas entradas cuja assinatura integral e versão coincidam.
- Resultados assíncronos só podem alterar o estado quando ainda pertencem à execução ativa.

### Copy específica no modo seguro

- Extrair linhas de conteúdo e assunto a partir do pedido integral atual.
- Gerar Hook, desenvolvimento progressivo e CTA usando detalhes presentes nessas linhas.
- Proibir o catálogo fixo de frases genéricas que produziu “Comece pelo conceito”, “Observe as consequências” e equivalentes.
- Preservar o caminho separado de copy explícita sem reescrita.

### Contratos por formato

- `minimalista`: hierarquia editorial direta, variação entre capa, desenvolvimento visual, artigo e CTA.
- `profile`: leitura clara, badge, variantes de explicação/citação/evidência/CTA e tipografia de texto.
- `creators`: progressão expressiva, alternância tipográfica, ritmo autoral e variantes próprias.
- `techviral`: títulos marcados, composição técnica, padrões e ritmo informativo próprios.
- `infinite`: continuidade horizontal e metadados de sequência, sem perder o contrato de canvas contínuo.
- A escolha explícita recebida pela função prevalece sobre globals antigos; reconstruções de auditoria recebem o mesmo contrato.

## Complexity Tracking

Nenhuma violação registrada.
