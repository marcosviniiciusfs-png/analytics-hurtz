# Implementation Plan: Instalar Playwright para testes

## Summary

Adicionar o Playwright Test como dependência de desenvolvimento, configurar uma suíte serial para Electron, criar um smoke test do Dashboard e instalar Chromium para os próximos testes web.

## Technical Context

- **Language/Version**: JavaScript CommonJS, Node.js 24, Electron 39
- **Primary Dependency**: `@playwright/test`
- **Testing**: Playwright Electron e Chromium
- **Target Platform**: Windows desktop
- **Project Type**: Aplicativo Electron
- **Performance Goal**: smoke test completo em até 60 segundos
- **Constraint**: nenhuma alteração funcional ou inclusão do runner no pacote de produção

## Constitution Check

A constituição local é um template sem princípios preenchidos. O fluxo obrigatório do AGENTS.md é atendido com especificação, plano, tarefas, implementação, teste e convergência.

## Project Structure

```text
Hurtz Flow Studio/
├── package.json
├── package-lock.json
├── playwright.config.js
├── tests/playwright/electron-dashboard.spec.js
└── .gitignore

specs/023-install-playwright-tests/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── tasks.md
└── checklists/requirements.md
```

## Design Decisions

1. Usar o runner oficial como dependência de desenvolvimento.
2. Iniciar o Electron diretamente pela API experimental oficial do Playwright.
3. Manter execução serial com um worker para evitar disputa de instância.
4. Reter trace somente em falhas e ignorar os artefatos gerados.
5. Instalar Chromium para habilitar testes do renderer e fluxos web futuros.

