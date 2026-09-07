# Conexões Meta Ads

O arquivo privado `/opt/meta-ads-cli/secrets/connections.json` (permissão `600`)
contém `connections`, com `id`, `name`, `app_id`, `access_token` e `account_ids`
por conexão. `META_CONNECTIONS_FILE` permite substituir esse caminho.
Nunca versionar esse arquivo nem disponibilizá-lo pelo servidor HTTP.

O acesso Tryv CRM (app `2093320124537661`) atende às contas
`act_1187686609470801`, `act_1280285297039435` e `act_4363508080554046`.
As demais contas continuam usando `META_ACCESS_TOKEN`. Descoberta, coleta de
gastos e análise de anúncios selecionam a credencial por conta, inclusive em
consultas paralelas. Páginas e formulários são metadados da conexão; isso não
implementa importação de leads nem sincronização com Google Sheets.

Validação local: `python -m unittest discover -s . -p test_account_credentials.py`.

## Facebook individual no Analytics

O usuário entra no Analytics por e-mail e conecta o Facebook pelo SDK oficial,
usando o app Tryv CRM. O servidor valida o app emissor, a identidade, as
permissões e a validade do token antes de guardar a conexão. A autorização
usa um desafio de uso único associado à sessão autenticada do Analytics.

Sessões e conexões individuais são criptografadas com AES-256-GCM em
`/opt/meta-ads-cli/secrets/personal` (diretório `700`, arquivos `600`).
`META_PERSONAL_DATA_DIR` permite configurar o diretório. A chave
`encryption.key` deve ser preservada junto com o backup privado. Nunca copiar
esses arquivos para o frontend, Git ou logs.

O SDK exige que o domínio do Analytics esteja autorizado nas configurações
do aplicativo Facebook. O token emitido pelo SDK mantém a validade definida
pela Meta; ao expirar, o usuário usa Reconectar Facebook. Não há promessa de
renovação indefinida ou extensão do token sem as credenciais do aplicativo.

Cada consulta verifica as contas acessíveis ao token daquele usuário. Os
relatórios recebem a credencial via stdin em `personal_report.py` e nunca
usam a credencial compartilhada como alternativa. Não há cache compartilhado
para esses relatórios. Planos e perfis ficam associados ao usuário.

As rotas administrativas existentes continuam restritas à sessão
administrativa. A conexão individual não libera tarefas, WhatsApp nem a
biblioteca compartilhada. Nenhuma assinatura de webhook ou envio de mensagem
é criado por esse fluxo. O login por e-mail agora emite uma sessão individual;
as sessões compartilhadas antigas foram invalidadas na implantação.

Teste de isolamento: `node --test "../Dashboard Meta Ads/personal-meta.test.cjs"`.
