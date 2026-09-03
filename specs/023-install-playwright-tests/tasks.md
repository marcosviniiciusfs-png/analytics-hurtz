# Tasks: Instalar Playwright para testes

## Phase 1: Setup

- [x] T001 Instalar `@playwright/test` e Chromium em `Hurtz Flow Studio/package.json` e `Hurtz Flow Studio/package-lock.json`
- [x] T002 Configurar o runner serial em `Hurtz Flow Studio/playwright.config.js`
- [x] T003 Ignorar artefatos Playwright em `Hurtz Flow Studio/.gitignore`

## Phase 2: User Story 1 - Executar testes automatizados

- [x] T004 [US1] Criar smoke test Electron em `Hurtz Flow Studio/tests/playwright/electron-dashboard.spec.js`
- [x] T005 [US1] Adicionar o comando `test:playwright` em `Hurtz Flow Studio/package.json`

## Phase 3: Validation

- [x] T006 Executar `npm run test:playwright` e validar encerramento limpo
- [x] T007 Verificar a instalação do Chromium e a ausência de artefatos versionáveis

## Dependencies

- T001 precede T002 e T004.
- T002, T004 e T005 precedem T006.
- T006 precede T007.
