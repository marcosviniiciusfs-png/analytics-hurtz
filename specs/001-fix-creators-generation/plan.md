# Implementation Plan: Corrigir geração Creators

## Technical Context

**Language/Version**: JavaScript (Electron renderer/main), Node.js 20+
**Primary Dependencies**: Electron, Google GenAI, gerador FLUX local, runtime interno de jobs
**Storage**: Estado local do projeto e sincronização Supabase já existente
**Testing**: Testes Node e E2E via Electron/Chrome DevTools Protocol
**Target Platform**: Windows desktop
**Project Type**: Aplicativo desktop de processo único com renderer web
**Performance Goals**: editor disponível imediatamente após a copy; mídia em segundo plano com progresso por slide
**Constraints**: preservar formatos existentes; imagens sem texto; não bloquear criação por falha de mídia; resultados assíncronos não podem vazar entre projetos

## Constitution Check

A constituição está como template não preenchido; nenhuma regra normativa adicional foi aplicada. As regras do workspace exigem Spec Kit, testes e convergência, contemplados neste plano.

## Project Structure

```text
Hurtz Flow Studio/
├── app.js
├── runtime-services.js
├── quality-core.js
└── scripts/
    ├── creators-generation-e2e-test.js
    └── smoke-test.js
```

## Phase 0: Research

Investigar a cadeia real de sobrescritas de `buildStandardCarouselSlide`, a política de elegibilidade de imagens e o ciclo do job assíncrono. Registrar decisões em `research.md`.

## Phase 1: Design

- Definir assinatura de composição por papel narrativo.
- Definir contrato de estado do job de imagem por slide.
- Definir cenários E2E determinísticos com provedor simulado.
- Documentar execução em `quickstart.md`.

## Implementation Strategy

1. Criar teste que reproduz Creators repetitivo e fila pendente.
2. Centralizar a resolução de variantes Creators por papel e índice.
3. Centralizar a seleção de slides que requerem imagem.
4. Tornar a fila identificável por projeto, com estados explícitos e retentativa segura.
5. Validar regressão completa e empacotamento.

## Post-Design Constitution Check

Sem violações: a constituição permanece um template; o plano mantém mudanças pequenas, testáveis e compatíveis.
