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

Arquivos acima de 1 MB usam `upload-start`, `upload-part` e `upload-finish`. Cada requisição transporta no máximo 1 MB de mídia, evitando o prazo de leitura de 60 segundos do proxy. As partes ficam temporariamente em diretório privado do processo, isoladas por usuário e conta, e são removidas após a confirmação ou falha da Meta. Envios abandonados expiram em 30 minutos; reiniciar o serviço invalida os envios incompletos.

O deploy do backend deve incluir `campaign-upload-store.js` junto com `campaign-manager.js`. O proxy compartilhado não precisa ser alterado. Repetir a última parte ou a confirmação final reutiliza a tentativa existente e não envia outra cópia à Meta. O navegador mantém o arquivo e a posição confirmada enquanto a tela permanece aberta.

`tests/campaign-upload-store.test.cjs` e `tests/campaign-upload-client.test.cjs` verificam isolamento, ordem, resposta perdida, retomada e prevenção de duplicação. O teste HTTP em `campaign-manager.test.cjs` usa 49,5 MB de dados sintéticos e compara os bytes recebidos.

- Testes unitários cobrem isolamento de contas/usuários, localidades verificadas, sugestões inválidas, falha do provedor, reutilização de criativo e criação pausada.
- Teste de navegador cobre os três destinos, revisão editável, modo manual, layout móvel, Escape e retorno do foco.
- Testes usam Meta e IA simuladas. A busca real de localização e a geração real precisam ser exercitadas com sessão autorizada e credencial de IA.
- Os arquivos auxiliares e scripts de validação referenciados pela skill design-code não estão instalados neste ambiente. A verificação visual usa capturas do navegador e testes locais.

Referências: [busca de segmentação no SDK oficial da Meta](https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/adobjects/targetingsearch.py) e [Chat Completions](https://platform.openai.com/docs/api-reference/chat).

## Navegação da conta

A conta abre na página dedicada `?view=account&account=act_ID`, mantendo as abas Campanhas, Desempenho e Análise e a configuração de pagamento. Links diretos só abrem contas presentes no catálogo autorizado do usuário. O botão Voltar, histórico e recarregamento preservam a navegação.

Criar anúncio abre a escolha Manual/Inteligente e depois um diálogo nativo independente. O formulário não ocupa o rodapé da página. Na criação em conjunto existente, a opção inteligente fica indisponível para não substituir silenciosamente o público e orçamento herdados.

O modo manual agrupa identidade/destino, público/orçamento e criativo. A consulta de campanhas abre primeiro; a auditoria de desempenho só é disparada ao abrir as abas correspondentes.

## Campanhas de site: visitas, leads e vendas

O destino Site oferece três objetivos. Visitas mantém `OUTCOME_TRAFFIC` com `LINK_CLICKS`, sem exigir Pixel. Leads usa `OUTCOME_LEADS` com `OFFSITE_CONVERSIONS` e os eventos `LEAD` ou `COMPLETE_REGISTRATION`. Vendas usa `OUTCOME_SALES` com `OFFSITE_CONVERSIONS` e `PURCHASE`. Os CTAs são Saiba mais, Cadastre-se e Comprar agora, respectivamente.

Para leads ou vendas, o usuário informa URL HTTPS, escolhe um Pixel disponível para a conta de anúncios e o evento, além dos dados habituais de público, orçamento, identidade, texto e criativo. O editor explica a instalação e oferece acesso ao Gerenciador de Eventos. É necessário confirmar que o evento foi testado no site. Alterar URL, Pixel ou evento remove essa confirmação. Essa confirmação é uma declaração do usuário, não uma verificação automática de instalação ou recebimento de eventos.

`GET /api/ads-manager/pixels?account=act_ID` consulta os Pixels da conta autorizada. O servidor verifica novamente a disponibilidade do Pixel antes de criar qualquer objeto e rejeita objetivos e eventos incompatíveis. Não aceita Pixel digitado livremente de outra conta. Conjuntos existentes mantêm seu objetivo e rastreamento; criar um anúncio neles não altera a configuração do conjunto.

Este fluxo utiliza Pixels existentes. Não cria nem instala Pixels em sites externos, não implementa API de Conversões e não verifica eventos automaticamente. A seleção da fonte de dados não substitui a instalação do Pixel ou a integração de eventos do site. A Meta continua responsável pela aceitação do anúncio e pelos requisitos específicos da conta, inclusive orçamento e elegibilidade.

Validação local: `node --test tests/campaign-manager.test.cjs` e `node tests/website-campaign-browser.cjs` (Playwright e Edge). Os testes simulam a Meta; não criam campanhas reais. O teste de navegador cobre objetivos, eventos, revisão, confirmação de instalação, alteração de URL, estados vazio/erro/nova tentativa e layout móvel.

Referências de implementação: [AdSet no SDK oficial da Meta](https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/adobjects/adset.py) e [eventos e promoted_object](https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/adobjects/adpromotedobject.py).

### Seleção e identificação automática de Pixel

A seleção de Pixel fica visível tanto no editor quanto na revisão para o destino Site, inclusive em Visitas. A lista consulta todas as páginas do catálogo da conta; Pixels indisponíveis aparecem desabilitados. Em tráfego, escolher um Pixel é opcional e adiciona `tracking_specs` ao anúncio, sem mudar a otimização para cliques. Em leads e vendas, o Pixel continua obrigatório no conjunto e é revalidado antes da criação.

Após preencher uma URL HTTPS, o editor chama `POST /api/ads-manager/website-pixel` com `{url}` e a conta autorizada. A API lê a página e até três scripts da mesma origem, procurando inicializações literais `fbq('init', 'ID')` e URLs de rastreamento do Pixel. Cruza os IDs com o catálogo da conta. Um único resultado compatível é selecionado automaticamente; mais de um pede escolha manual. IDs sem acesso nessa conta não são selecionados. A sugestão nunca substitui uma escolha manual e respostas de URLs anteriores são descartadas.

Essa análise não executa JavaScript, aceita consentimento nem confirma recebimento de eventos. Ausência de ID no código público é reportada como identificação inconclusiva, não como prova de que o site não tem Pixel. Falha de leitura também mantém a escolha manual. O usuário pode verificar novamente ou atualizar o catálogo. A confirmação de teste do evento não é marcada automaticamente.

A leitura externa tem prazo total de 12 segundos, limite de bytes, HTTPS e validação de endereços em cada redirecionamento. Conecta apenas a IPv4 público resolvido e fixado na conexão, preservando validação TLS do hostname. Não transmite credenciais Meta, cookies ou código da página ao cliente. Sites privados ou apenas IPv6 não são inspecionados. Testes em `tests/website-pixel-inspector.test.cjs` cobrem correspondência com a conta, limites, DNS e redirecionamentos; o teste de navegador também cobre preservação da escolha manual e respostas atrasadas.

A revisão mostra a análise em um card na célula ao lado da URL (abaixo dela em telas estreitas). Durante a leitura, usa uma barra indeterminada, sem percentuais estimados. Ao terminar, o mesmo card mostra o resultado, a seleção de Pixel e ações para verificar novamente ou atualizar a lista. Progresso e erros atualizam esse card sem reconstruir os campos em edição. A publicação usa os valores atuais do formulário e não deixa uma resposta automática pendente alterar uma operação já iniciada.

### Recuperação da leitura do criativo

Quando o OCR não identifica cidade ou oferta, o analisador envia até seis frames distribuídos pelo vídeo para uma leitura visual via OpenRouter. O modelo padrão é `openrouter/free`, sem fallback automático para modelos pagos; uma instalação pode definir `CAMPAIGN_VIDEO_VISION_MODEL`. A leitura visual transcreve texto visível e alimenta a análise existente, que continua validando a cidade na Meta e buscando os interesses na conta. Não infere localização pela imagem do imóvel.

Se nenhuma fala ou texto puder ser recuperado, a API retorna erro 422 em vez de entregar um rascunho vazio como concluído. Normalização e identificação da oferta usam a evidência completa antes de limitar o texto mostrado na revisão. Os testes de `video-visual-evidence.test.cjs` simulam OCR vazio, recuperação de Itajaí/SC com crédito imobiliário, indisponibilidade da leitura visual e limites de frames/texto. A validação da precisão no criativo específico exige o arquivo original; as capturas de tela não contêm a trilha nem os frames originais.
