# Implementation Plan: Preservar copy explícita

## Technical Context

**Language**: JavaScript/Electron
**Files**: `Hurtz Flow Studio/app.js`, `Hurtz Flow Studio/scripts/explicit-copy-e2e-test.js`, `Hurtz Flow Studio/package.json`
**Testing**: parser determinístico no renderer e E2E Electron
**Constraint**: nenhuma etapa posterior pode mutar texto no modo fechado.

## Constitution Check

Constituição ainda é template. Fluxo Spec Kit e teste de regressão são atendidos.

## Design

1. Detectar o contrato explícito antes de chamar qualquer modelo.
2. Extrair blocos e destaques de forma determinística.
3. Construir os slides diretamente e marcar `copyMode: exact`.
4. Pular humanização, validação semântica mutável e reparo textual.
5. Permitir apenas correção visual de overflow.
6. Manter o caminho atual intacto para prompts abertos.

## Validation

- Comparação exata de seis slides.
- Presença do produto e CTA.
- Destaques de título e corpo.
- Confirmação de zero chamadas ao modelo de copy no modo fechado.
- Suíte completa.
