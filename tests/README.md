# Acesso individual ao Facebook

Execute na raiz do repositório:

```sh
node --test "Dashboard Meta Ads/personal-meta.test.cjs"
python -m unittest discover -s "Meta Ads Monitor" -p "test_*.py"
```

Para testar a interface, instale Playwright no ambiente de desenvolvimento e execute `node tests/personal-browser.cjs`. O teste usa Edge no Windows ou o Chromium instalado pelo Playwright nos demais sistemas. `PLAYWRIGHT_EXECUTABLE_PATH` permite escolher outro executável compatível.

O teste de interface simula a Meta, sem credenciais reais. Verifica descoberta e atualização das contas, remoção de acessos revogados, limites dos lotes, análise, relatórios reconciliados, recuperação de perfis, erros de permissão, reconexão e dois usuários no mesmo navegador. Os testes de servidor verificam autorização por conta, aplicativo emissor, permissões, expiração, proteção contra reutilização do desafio e revogação durante consultas.

A validação real de Facebook exige uma conexão autorizada no servidor. Não coloque tokens em testes, arquivos públicos ou argumentos de comandos.
