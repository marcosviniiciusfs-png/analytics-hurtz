# Ferramentas individuais em produção

Ative `ANALYTICS_PERSONAL_TOOLS=1` somente na API. O login continua no Supabase;
`ANALYTICS_LOCAL_ONLY` deve estar ausente ou ser `0`. O atalho `/api/local/session`
é recusado em produção. A interface descobre as ferramentas em `/api/session`.

Use uma réplica da API para o armazenamento em arquivos e o agendador. O volume
`META_PERSONAL_DATA_DIR` deve ser persistente e privado. Faça backup dos dados e
da `encryption.key` juntos; nunca os inclua no Git ou no artefato do Pages.

Apify e Evolution utilizam as credenciais de serviço existentes no servidor.
Os usuários podem informar uma chave própria; o endereço da Evolution em produção
é fixado pelo administrador. As credenciais não retornam ao navegador. Cada
usuário possui tarefas, biblioteca, pesquisas, instâncias e regras de alertas
separadas. Alertas começam desativados e em modo de validação. Cada pessoa precisa
escanear o QR Code e selecionar o grupo da própria instância antes de enviar.

O Facebook continua usando exclusivamente o token da pessoa conectada, validado
como pertencente ao Tryv CRM. As permissões adicionais para comentários são
solicitadas pelo botão específico em Configurações e dependem da aprovação do app.

Com `ANALYTICS_SHARED_ANALYZER=1`, a análise visual fica habilitada para todos
os usuários atuais e futuros. O operador provisiona uma credencial privada com
escopo `platform_agent`; esse escopo não pode ser emitido pela interface dos
usuários. O agente recebe trabalhos de todas as filas, mas só pode baixar mídia
e devolver resultados dos trabalhos que assumiu. Pesquisas, resultados e
credenciais Apify continuam separados por usuário. Esse token de serviço não
permite consultar Facebook, tarefas ou configurações.

O computador com Ollama, Qwen2.5-VL e FFmpeg precisa permanecer ligado e conectado.
Uma thread mantém o sinal de atividade durante a inferência. A credencial de
serviço provisionada vale 90 dias e sua renovação é responsabilidade do operador.
As conexões individuais de agente e extensão continuam válidas por 7 dias.

Os relatórios utilizam o resultado principal de cada campanha. O total de uma
conta soma essas métricas por campanha; leads e conversas permanecem disponíveis
separadamente e não representam pessoas únicas. Nomes de campanhas não definem
o canal. A conciliação de gasto é independente de avisos de atribuição. Falhas de
prévias ou status não apagam os Insights já retornados pela Meta.

O Pages é preparado por `node dev/build-pages.cjs`, com uma lista explícita de
arquivos públicos. Nenhum módulo de backend é enviado no artefato público.
