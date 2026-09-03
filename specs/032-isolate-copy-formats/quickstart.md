# Quickstart: validar isolamento de copy e formatos

## Prerequisites

- Dependências já instaladas em `Hurtz Flow Studio/node_modules`.
- Nenhuma conexão de imagem é necessária para estes testes.

## Automated validation

```powershell
cd "C:\Users\Brito\Desktop\principal\Projetos\CBO\Hurtz Flow Studio"
node scripts/copy-context-isolation-test.js
node scripts/copy-context-isolation-e2e-test.js
node scripts/generation-context-e2e-test.js
node scripts/format-contract-matrix-e2e-test.js
node scripts/copy-error-containment-test.js
node scripts/explicit-copy-e2e-test.js
node scripts/text-first-structures-e2e-test.js
npx playwright test tests/playwright/project-persistence.spec.js
npm test
```

## Manual validation

1. Gere cinco slides sobre “como organizar uma reserva de emergência” no formato Profile.
2. Sem reiniciar o aplicativo, gere cinco slides sobre “rotina de cuidados de uma horta doméstica” no formato Creators.
3. Confirme que o segundo resultado não contém dinheiro, reserva ou emergência.
4. Confirme que o Profile usa badge e leitura editorial clara, enquanto Creators usa progressão expressiva e tipografia própria.
5. Repita o segundo pedido com TechViral e confirme mudança real de estrutura sem mudança de assunto.
6. Salve, feche e abra o aplicativo; confirme que o projeto permanece igual e não inicia nova geração.

## Expected outcomes

- Nenhuma frase de outro assunto aparece na geração atual.
- Nenhum slide usa o fallback “Comece pelo conceito / Observe as consequências”.
- Cada formato possui assinatura visual distinta.
- Copy explícita, persistência e editor continuam funcionando.
