# Assistente Hurtz — WhatsApp

Atendente humanizado para WhatsApp, conectado a uma instância exclusiva da Evolution API. A versão 1.4.0 adiciona presença durante o processamento real, cancelamento de respostas antigas, timeout, telemetria por etapa e memória em baixa prioridade.

## O que funciona

- criação de uma instância Hurtz isolada e conexão por QR Code;
- webhook individual, com recusa de instâncias não gerenciadas pelo Hurtz;
- deduplicação e agrupamento de mensagens curtas;
- memória por contato em SQLite com sincronização preparada para Cloudflare D1;
- envio de PDFs por arrastar e soltar no próprio painel;
- extração, divisão e indexação automática do conteúdo dos PDFs;
- consulta do conhecimento pelo Ollama;
- transcrição e voz natural pelo Google AI Studio quando a chave estiver configurada;
- conversão da voz para OGG/Opus com FFmpeg;
- escolha automática entre resposta de texto e áudio;
- transferência para atendimento humano;
- atendimento automático desativado por padrão.

## Como abrir

Abra `Hurtz Launcher.exe` e clique em **Abrir Atendente WhatsApp**. O sistema abre em uma janela desktop própria; backend e Cloudflare Tunnel ficam ocultos e são encerrados junto com a janela.

## Configuração segura

1. Copie `.env.example` para `.env`.
2. Preencha somente as credenciais dos serviços que serão usados.
3. Não exponha `SUPABASE_SERVICE_ROLE_KEY`, `EVOLUTION_API_KEY` ou `GEMINI_API_KEY` no navegador ou em repositório.
4. Adicione os PDFs pela tela **Conhecimento**.
5. Faça um teste autorizado com um número exclusivo.
6. Ative o atendimento automático somente depois da validação.

O painel e o processador de PDFs permanecem no computador local e escutam apenas em `127.0.0.1`. A VPS hospeda somente os serviços que precisarem receber eventos externos; ela não recebe nem armazena os PDFs originais.

## Cloudflare

A infraestrutura fica em `cloudflare/`: Worker privado, migrations D1 e integração Vectorize. Os PDFs originais ficam exclusivamente em `data/knowledge-pdfs/` no computador local. Somente textos extraídos e vetores são sincronizados com a Cloudflare; a VPS não recebe esses arquivos. Inclua a pasta local no backup do computador.

O D1 é o banco central de instâncias, contatos, mensagens, estado humano/bot, documentos e memória. O SQLite local permanece como contingência para o aplicativo continuar funcionando durante uma indisponibilidade de internet. O Supabase não faz parte desta arquitetura.

Veja [CONFIGURAR_SERVICOS.md](CONFIGURAR_SERVICOS.md) para criar o projeto e concluir a conexão.

## Garantia de isolamento

- o Hurtz cria nomes aleatórios iniciados por `hurtz-`;
- somente instâncias criadas pelo painel são registradas como pertencentes ao Hurtz;
- cada instância recebe um webhook individual;
- webhooks de outras instâncias retornam `403`;
- não existe configuração de webhook global;
- o painel não edita nem remove instâncias de outras ferramentas.

Use um número dedicado ao Hurtz. O mesmo WhatsApp ligado a duas automações pode gerar respostas duplicadas mesmo com instâncias isoladas.
