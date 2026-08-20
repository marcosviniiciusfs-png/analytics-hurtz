# Research: Playwright no Hurtz Flow Studio

## Decision: runner oficial

- **Decision**: instalar `@playwright/test` como dependência de desenvolvimento.
- **Rationale**: fornece asserções, relatório, trace e integração com Electron em um único runner.
- **Alternatives considered**: manter apenas os scripts CDP existentes; não oferece a mesma ergonomia nem os recursos de depuração do Playwright.

## Decision: Electron primeiro, Chromium disponível

- **Decision**: o smoke test inicia o Electron, enquanto Chromium é instalado para testes web posteriores.
- **Rationale**: valida o produto real agora e deixa o ambiente pronto para cobrir renderer e integrações no navegador.
- **Alternatives considered**: testar somente `index.html`; não cobre a integração desktop.

