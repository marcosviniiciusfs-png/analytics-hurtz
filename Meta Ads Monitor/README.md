# Monitor Meta Ads

Scripts somente leitura para validar autenticação, consultar contas e coletar métricas da Meta.

- `refresh_token.py`: valida e troca o token sem imprimi-lo.
- `diagnose_access.py`: lista contas e consulta campanhas e insights.
- `env_utils.py`: atualiza o arquivo de credenciais na VPS.
- `billing_browser_collector.js`: captura o saldo pré-pago exibido no Billing Hub.

As credenciais da Graph API ficam somente na VPS em
`/opt/meta-ads-cli/secrets/.env`, com permissão `600`.

## Saldo pré-pago do Billing Hub

O saldo exibido em Cobrança e pagamentos não é o campo público
`AdAccount.balance`. Ele é retornado como `prepay_balance.amount_with_offset`
por uma consulta autenticada do Billing Hub.

Instale as dependências:

```powershell
npm.cmd install
```

Execute localmente, passando a URL completa da tela de cobrança:

```powershell
npm.cmd run billing:collect -- "URL_DA_TELA_DE_COBRANCA"
```

Na primeira execução, faça login na janela separada do Chrome. O perfil fica
somente em `browser-profile/` e não deve ser enviado ou versionado. O resultado
é gravado em `data/prepay-balances.json`.
