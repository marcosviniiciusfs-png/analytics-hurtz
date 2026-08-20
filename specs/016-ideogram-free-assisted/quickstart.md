# Quickstart Validation: Ideogram gratuito assistido

## Prerequisites

- App em modo de desenvolvimento.
- Navegador configurado para baixar na pasta padrão de Downloads do Windows.
- Um carrossel com ao menos dois slides sem imagem.

## Automated validation

```powershell
cd "Hurtz Flow Studio"
node scripts/ideogram-download-watcher-test.js
node scripts/ideogram-web-assisted-e2e-test.js
npm test
```

Expected: arquivos parciais e antigos são ignorados, o arquivo estável é detectado uma vez, IPC e interface estão presentes e a suíte completa permanece verde.

## Manual end-to-end

1. Abra um slide sem imagem e clique em `Gerar imagem deste slide`.
2. Confira o prompt editável e clique em `Copiar prompt e abrir Ideogram`.
3. Gere a imagem no site e use o botão oficial de download.
4. Volte ao app.

Expected: o diálogo mostra espera e importação, a imagem aparece no slide inicial mesmo se outro slide estiver selecionado e a procedência mostra `Ideogram 4 · web gratuito`.

## Failure and cancellation

1. Inicie outra sessão e clique em cancelar.
2. Baixe uma imagem depois do cancelamento.
3. Inicie novamente, mas use `Escolher arquivo manualmente`.

Expected: o download após cancelamento não altera o projeto; a seleção manual preenche o slide da sessão e avança a fila.
