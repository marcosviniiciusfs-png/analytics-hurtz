# Implementation Plan: Conter falhas internas da geração de copy

**Branch**: `031-copy-error-containment` | **Date**: 2026-08-15 | **Spec**: `specs/031-copy-error-containment/spec.md`

## Summary

Separar completamente diagnósticos operacionais do conteúdo editorial. A recuperação recebe apenas um código neutro, valida cada resposta contra o assunto original e rejeita textos contaminados. Se o modelo continuar falhando, um roteiro seguro é criado sem usar a mensagem da exceção.

## Technical Context

**Language/Version**: JavaScript, Electron 39 e Node.js

**Primary Dependencies**: Electron, Ollama local, motor de copy existente e Playwright

**Storage**: Estado persistente do projeto e cache local de copy

**Testing**: Teste unitário de contrato e Playwright com Electron

**Target Platform**: Windows 10/11 desktop

**Project Type**: Aplicativo desktop Electron

**Performance Goals**: No máximo três tentativas de recuperação; fallback local imediato depois do limite

**Constraints**: Nunca usar mensagem de exceção como conteúdo; preservar copy exata; não sobrescrever projeto válido antes do commit da nova geração

**Scale/Scope**: Carrosséis de 1 a 10 slides

## Constitution Check

- Especificação criada antes da alteração: PASS.
- Correção acompanhada por teste que reproduz a falha: PASS.
- Humanizer continua sendo a etapa final para texto autoral: PASS.
- Copy marcada para preservação literal continua protegida: PASS.

## Project Structure

```text
specs/031-copy-error-containment/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/copy-recovery.md
└── tasks.md

Hurtz Flow Studio/
├── app.js
├── copy-engine.js
├── runtime-services.js
├── scripts/copy-error-containment-test.js
├── tests/playwright/copy-error-containment.spec.js
└── package.json
```

**Structure Decision**: A classificação determinística fica no motor de copy (`copy-engine.js`) e é aplicada pelo fluxo do renderer (`app.js`). O processo principal continua responsável apenas por comunicar erros reais do Ollama.

## Complexity Tracking

O guard é determinístico e barato. Chamadas adicionais só acontecem quando a resposta inicial é inválida.
