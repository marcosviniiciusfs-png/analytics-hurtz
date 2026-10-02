# Fluxo — Meta Lead Ads para grupo WhatsApp

Serviço próprio em Node.js que recebe `leadgen` da Meta, busca os dados do lead e envia uma mensagem para um grupo pela Evolution API.

## Configuração

1. Copie `.env.example` para `.env` e preencha as variáveis. `GROUP_JID` tem o formato `120363XXXXXXXXXX@g.us`.
2. Execute `npm install` e `npm start` (Node.js 18 ou superior).
3. Confirme em `http://localhost:3000/health`.

Para descobrir o grupo, conecte a instância na Evolution, preencha `EVO_URL`, `EVO_INSTANCE` e `EVO_APIKEY`, depois rode `npm run groups`. O comando mostra `nome: JID` de cada grupo.

## Teste local

Em um terminal, use valores de teste no `.env` e `TEST_MODE=true`. Em outro, rode `npm run test-lead`. O script assina o payload com `META_APP_SECRET` e o serviço simula a consulta/envio, sem usar APIs externas.

## Docker

```bash
docker compose up -d --build
```

O compose lê o `.env`, publica a porta 3000 e reinicia com `unless-stopped`.

## Meta Lead Ads

1. Crie um app na Meta e adicione Webhooks.
2. Em **Webhooks**, assine o objeto **Page** e o campo **leadgen**.
3. Informe a URL pública HTTPS terminando em `/webhook` e o mesmo `VERIFY_TOKEN` do `.env`.
4. Obtenha um token de acesso da Página com as permissões `leads_retrieval`, `pages_manage_metadata`, `pages_show_list` e `pages_read_engagement` e coloque-o em `PAGE_ACCESS_TOKEN`.
5. Use a **Lead Ads Testing Tool** para gerar um lead de teste.

O servidor valida `X-Hub-Signature-256`, responde à Meta antes do processamento, evita IDs repetidos em memória e tenta o envio à Evolution até três vezes com backoff. Os segredos nunca são registrados em log.

## Construtor visual no Traffic Pocket

Na seção **Fluxo**, informe a URL do serviço (localmente `http://127.0.0.1:3000`) e clique em **Conectar**. Selecione a conta de anúncio, a página, o formulário instantâneo, a instância e o grupo da Evolution; conecte os blocos, marque o fluxo como ativo e salve.

A configuração é persistida em `data/flow.json` no servidor. O webhook só encaminha eventos cujo `form_id` corresponde ao formulário salvo, sem misturar leads de outros formulários.
