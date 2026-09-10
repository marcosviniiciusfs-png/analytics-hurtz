# Criação rápida de campanhas

Em Contas → Campanhas → Criar anúncio, o usuário escolhe criação manual ou rápida. Anúncios em conjuntos existentes mantêm o editor manual e herdam as configurações do conjunto.

O modo rápido consulta localizações da Meta, usa somente contexto de anúncios da Página autorizada na conta selecionada e gera um rascunho por IA. Uma Página sem contexto exige uma descrição da oferta. Texto, orçamento e categoria são sugestões editáveis. O público inicial é amplo (18–65+), na localização escolhida. Objetivo e otimização seguem o destino: site, WhatsApp ou formulário.

Uma imagem anterior com prévia pode ser reutilizada. Este recurso não gera imagens ou vídeos novos. Na ausência de um criativo reutilizável, o usuário envia um arquivo. Site, telefone e formulário são reaproveitados quando encontrados; valores ausentes precisam ser preenchidos. Formulários e demais ativos são verificados novamente antes de criar anúncios.

Nenhum planejamento faz alterações na Meta. O envio continua exigindo revisão e cria campanha, conjunto e anúncio pausados. Orçamento, público, criativo e destino aparecem na revisão. Ativação é uma ação posterior confirmada pelo usuário.

## Configuração da IA no servidor

Configurar `OPENAI_API_KEY` no ambiente da API ou no arquivo privado `/opt/meta-ads-cli/secrets/campaign-ai.env`, acessível somente ao processo do servidor. O arquivo aceita:

```dotenv
OPENAI_API_KEY=
CAMPAIGN_AI_MODEL=gpt-4o-mini
```

O caminho pode ser substituído por `CAMPAIGN_AI_FILE`. Nunca colocar a chave no JavaScript público, repositório ou armazenamento do navegador. O serviço usa `https://api.openai.com/v1/chat/completions` e envia nome da Página, oferta fornecida e até cinco exemplos de anúncios daquela Página; não envia tokens da Meta, dados de leads ou comentários. Uma chave compartilhada no servidor atende os usuários autenticados; não é necessário configurar uma chave por usuário.

Sem credencial, o backend informa que a IA não está configurada e mantém o modo manual. Não simula geração de IA com respostas fixas. Há bloqueio de chamadas simultâneas por usuário e intervalo mínimo de 15 segundos entre tentativas de geração.

O deploy precisa incluir `campaign-planner.js` no backend. Esse arquivo deve permanecer fora do artefato público do GitHub Pages. O helper local `deploy-campaign-manager.cjs` foi atualizado para incluí-lo.

## Validação

- Testes unitários cobrem isolamento de contas/usuários, localidades verificadas, sugestões inválidas, falha do provedor, reutilização de criativo e criação pausada.
- Teste de navegador cobre os três destinos, revisão editável, modo manual, layout móvel, Escape e retorno do foco.
- Testes usam Meta e IA simuladas. A busca real de localização e a geração real precisam ser exercitadas com sessão autorizada e credencial de IA.
- Os arquivos auxiliares e scripts de validação referenciados pela skill design-code não estão instalados neste ambiente. A verificação visual usa capturas do navegador e testes locais.

Referências: [busca de segmentação no SDK oficial da Meta](https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/adobjects/targetingsearch.py) e [Chat Completions](https://platform.openai.com/docs/api-reference/chat).

## Navegação da conta

A conta abre na página dedicada `?view=account&account=act_ID`, mantendo as abas Campanhas, Desempenho e Análise e a configuração de pagamento. Links diretos só abrem contas presentes no catálogo autorizado do usuário. O botão Voltar, histórico e recarregamento preservam a navegação.

Criar anúncio abre a escolha Manual/Inteligente e depois um diálogo nativo independente. O formulário não ocupa o rodapé da página. Na criação em conjunto existente, a opção inteligente fica indisponível para não substituir silenciosamente o público e orçamento herdados.

O modo manual agrupa identidade/destino, público/orçamento e criativo. A consulta de campanhas abre primeiro; a auditoria de desempenho só é disparada ao abrir as abas correspondentes.
