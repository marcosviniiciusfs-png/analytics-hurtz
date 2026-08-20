# Implementation Plan: Humanizer como validação final da copy

**Branch**: `030-humanizer-final-gate` | **Date**: 2026-08-14 | **Spec**: `specs/030-humanizer-final-gate/spec.md`

## Summary

Transformar o Humanizer de uma solicitação opcional ao modelo em um gate final verificável. O motor de copy expõe análise, prompt de reparo e fallback conservador. O gerador executa o gate depois da auditoria estrutural, valida a resposta e preserva integralmente os modos de copy fechada.

## Technical Context

**Language/Version**: JavaScript (Electron 39 / Node.js)

**Primary Dependencies**: Electron, Ollama local, Humanizer rules, Playwright

**Storage**: Estado do projeto persistente existente

**Testing**: Node smoke tests e Playwright/Electron

**Target Platform**: Windows 10/11 desktop

**Project Type**: Aplicativo desktop Electron

**Performance Goals**: Nenhuma chamada adicional quando a copy já passa; no máximo uma revisão dirigida por geração reprovada

**Constraints**: Preservação literal para `exact` e `preserved`; nenhuma invenção factual; não bloquear a entrega por falha do modelo

**Scale/Scope**: Carrosséis de até 10 slides, legenda e hashtags

## Constitution Check

- Spec criada antes da implementação: PASS.
- Humanizer aplicado como etapa final para texto autoral: PASS.
- Texto explícito com “manter exatamente” preservado: PASS.
- Teste de regressão obrigatório antes da entrega: PASS.

## Project Structure

```text
specs/030-humanizer-final-gate/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/humanizer-gate.md
└── tasks.md

Hurtz Flow Studio/
├── copy-engine.js
├── app.js
├── quality-core.js
├── scripts/humanizer-final-gate-test.js
└── package.json
```

**Structure Decision**: As regras editoriais puras ficam no motor de copy; a chamada ao modelo e a integração com o estado permanecem no gerador.

## Complexity Tracking

O gate só executa revisão remota quando a análise encontra um problema. O fallback determinístico é limitado a transformações seguras.
