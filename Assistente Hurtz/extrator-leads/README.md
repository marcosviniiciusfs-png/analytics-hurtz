# Hurtz — Extrator de Leads

Ferramenta desktop para coletar e revisar oportunidades presentes em comentários de posts públicos, sem usar uma conta do Facebook ou Instagram.

## Fluxo

1. O usuário informa termos, redes sociais, período e limite de resultados.
2. O Hurtz pesquisa publicações públicas e consulta assunto, data e quantidade pública de comentários.
3. O usuário escolhe quais publicações deseja analisar e define o limite de comentários.
4. A Apify coleta os comentários das publicações selecionadas.
5. O Hurtz normaliza nome, perfil, comentário, bio e contatos explicitamente públicos.
6. O classificador atribui intenção e score de 0 a 100.
7. O usuário aprova, descarta ou mantém o lead pendente e pode exportar o CSV.

## Configuração

Abra **Configuração** dentro do aplicativo e informe a chave da Apify. A chave fica no arquivo local de dados e não é devolvida pela API nem exibida novamente.

Por padrão, os dados são excluídos depois de 30 dias. O prazo pode ser ajustado entre 1 e 365 dias.

## Limites importantes

- A ferramenta trabalha apenas com URLs públicas fornecidas pelo usuário.
- A disponibilidade dos dados depende da plataforma e do Actor configurado na Apify.
- O score não autoriza contato automático. Todo lead deve passar por revisão humana.
- O campo de gênero não é inferido pelo nome; permanece “Não informado” quando não existe informação pública explícita.

## Desenvolvimento

```powershell
npm test
npm start
```

Servidor local: `http://127.0.0.1:3340`.
