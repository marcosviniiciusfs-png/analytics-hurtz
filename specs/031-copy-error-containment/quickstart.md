# Quickstart: validar contenção de erros na copy

## Cenário principal

1. Inicie o aplicativo em modo de teste.
2. Force a primeira chamada de copy a retornar “modelo local retornou resposta vazia”.
3. Faça as tentativas seguintes devolverem um carrossel sobre backend, logs e configurações.
4. Gere um carrossel sobre um assunto não técnico.
5. Confirme que nenhum slide contém o diagnóstico e que o roteiro permanece ligado ao assunto.

## Cenário de controle técnico

1. Use um pedido explicitamente relacionado a logs e backend.
2. Confirme que os termos técnicos continuam permitidos.

## Comandos

```powershell
npm run test:copy-recovery
npx playwright test tests/playwright/copy-error-containment.spec.js
npm test
```

## Resultado esperado

- O caso de regressão é rejeitado.
- O fallback não contém “modelo retornou resposta vazia”.
- O estado registra a recuperação separadamente.
- Nenhum erro não tratado ocorre no renderer.
