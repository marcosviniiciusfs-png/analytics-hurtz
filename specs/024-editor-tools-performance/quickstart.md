# Quickstart: auditoria Playwright do editor

```powershell
cd "Hurtz Flow Studio"
npm run test:playwright -- tests/playwright/editor-tools-performance.spec.js
```

Resultado esperado:

- todas as famílias de ferramentas exercitadas;
- nenhum erro JavaScript;
- cards inativos sem mutação durante arrastes;
- scroll responsivo;
- métricas dentro dos limites da especificação.

Validação de 13/08/2026:

- `npm run test:playwright -- --reporter=line`: 2/2 aprovados;
- `npm test`: aprovado, com 90 controles vinculados;
- matrizes de isolamento, cards inativos, Fundo do slide, Sombra/Overlay, cores/cantos e layout: aprovadas;
- no executável instalado 1.60.10, p95 do ciclo completo de interação do Playwright: 115 ms, máximo: 127 ms;
- 100 atualizações contínuas de estado/canvas: 1,4 ms no total; rolagem programática: 0,8 ms;
- erros do renderer e long tasks: 0.
