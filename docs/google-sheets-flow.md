# Fluxos para Google Sheets

O Traffic Pocket usa OAuth 2.0 do Google no servidor. A integração é gratuita: habilite as APIs **Google Sheets API** e **Google Drive API** no mesmo projeto do Google Cloud e crie um cliente OAuth do tipo **Web application**.

Cadastre exatamente esta URL de redirecionamento:

`https://traffic-api.hurtzcompany.com/api/flow/google/callback`

No repositório, configure estes secrets de Actions:

- `TRAFFIC_POCKET_GOOGLE_OAUTH_CLIENT_ID`
- `TRAFFIC_POCKET_GOOGLE_OAUTH_CLIENT_SECRET`
- `TRAFFIC_POCKET_GOOGLE_OAUTH_REDIRECT_URI` com a URL acima

Após o deploy, abra **Fluxo**, escolha **Google Sheets** como recebimento e clique em **Conectar Google Sheets**. A primeira linha de cada aba é usada como os nomes das colunas; o editor mostra cada coluna para mapeamento. O token de renovação fica criptografado no volume privado da API e nunca é enviado ao navegador.

Para receber leads de um formulário do site, escolha a origem **HTTP do meu site**, salve o fluxo e envie um `POST` JSON para o endpoint mostrado no editor. O endereço contém um segredo próprio do fluxo; trate-o como senha e não o publique no front-end.
