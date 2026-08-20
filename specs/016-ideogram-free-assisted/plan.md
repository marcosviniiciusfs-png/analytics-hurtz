# Implementation Plan: Fluxo gratuito assistido do Ideogram

**Branch**: `016-ideogram-free-assisted` | **Date**: 2026-08-13 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/016-ideogram-free-assisted/spec.md`

## Summary

Substituir o caminho pesado de geração local por uma jornada assistida: o renderer cria um prompt em português e conduz uma fila por slide; o processo principal abre diretamente o painel oficial de criação e observa a pasta Downloads; um módulo isolado valida estabilidade e tipo do arquivo antes de devolvê-lo ao slide vinculado por identificador estável. A interface usa um diálogo guiado, passo a passo numerado, prompt recolhível, estados acessíveis e fallback de seleção manual.

## Technical Context

**Language/Version**: JavaScript, Electron 39, Node.js embarcado

**Primary Dependencies**: Electron IPC, `fs.watch`, timers Node, Lucide; sem nova dependência de runtime

**Storage**: estado atual do projeto e imagens em data URL; leitura limitada à pasta Downloads

**Testing**: scripts Node de contrato, integração do monitor em diretório temporário e suíte E2E existente

**Target Platform**: Windows 11 desktop

**Project Type**: aplicativo desktop Electron

**Performance Goals**: detecção em até 3 s após estabilização; nenhuma tarefa pesada no renderer; um único monitor ativo; modal sem reflow ou sobreposição em telas de notebook

**Constraints**: não automatizar o site; não usar API paga; não aceitar arquivos parciais, antigos ou acima de 50 MB; preservar edição responsiva

**Scale/Scope**: uma sessão por vez, filas de até 10 slides, um usuário local

## Constitution Check

A constituição é um template sem princípios ratificados. Aplicam-se as regras do AGENTS.md: Spec Kit completo, testes e convergência. Gate aprovado. A UI seguirá a anatomia shadcn (diálogo, progresso, alertas e botões com estados) traduzida para o HTML/CSS nativo já existente, sem introduzir React ou Tailwind.

## Project Structure

### Documentation (this feature)

```text
specs/016-ideogram-free-assisted/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
└── tasks.md
```

### Source Code (repository root)

```text
Hurtz Flow Studio/
├── main.js
├── preload.js
├── app.js
├── product-ui.css
├── scripts/
│   ├── ideogram-download-watcher.js
│   ├── ideogram-download-watcher-test.js
│   └── ideogram-web-assisted-e2e-test.js
└── package.json
```

**Structure Decision**: manter a aplicação monolítica existente, isolando a observação do filesystem em módulo Node testável e expondo ao renderer apenas operações IPC estritamente necessárias.

## Complexity Tracking

Nenhuma violação constitucional identificada.
