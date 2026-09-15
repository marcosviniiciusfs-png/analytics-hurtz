# Controle das consultas à Meta

## Política de leitura

- Cache em memória por usuário, revisão da conexão, conta, período, tipo de relatório e modo completo/resumido: cinco minutos.
- Atualização manual pode renovar após um minuto. Cliques antes disso reaproveitam o resultado.
- Contas repetidas em consultas simultâneas compartilham a execução, mesmo em seleções parcialmente sobrepostas.
- Um processo de relatório por vez no serviço; fila limitada a 20 execuções aguardando. O navegador também envia um lote por vez.
- Até duas contas e duas chamadas HTTP simultâneas por coletor. Inícios de chamadas são espaçados por pelo menos 500 ms em um estado SQLite compartilhado entre processos que usam o mesmo diretório.
- Ao atingir 85% nos indicadores de uso recebidos, aumenta o intervalo para dois segundos; a partir de 95%, dez segundos. Esses são parâmetros locais conservadores, não limites oficiais da Meta.
- Erros de limite, incluindo subcódigo 1504022, interrompem novas chamadas. Pausa inicial de dois minutos, progressiva até 30 minutos, respeitando uma espera maior informada pela Meta. Não há repetição imediata do erro de limite.
- Apenas falhas HTTP 500/502/503/504 recebem uma segunda tentativa de leitura, com atraso aleatório. Falhas de autorização não são repetidas.

## Segurança e continuidade

A autorização da conta é verificada antes de acessar o cache. Resultados com erro ou sem reconciliação não entram nele. Desconectar ou trocar a conexão invalida o escopo e impede entregar um relatório ainda em execução. Limite de cache: 150 contas/períodos ou 32 MiB. Nenhum token é armazenado no arquivo de controle de consultas.

O dashboard mantém os resultados carregados durante uma atualização que falhou. O navegador mostra a pausa e o horário para tentar novamente; não inicia uma consulta automática ao final. Um reinício esvazia o cache de resultados, mas o controle Python persiste no diretório compartilhado `/opt/meta-ads-cli/secrets` quando disponível. É possível substituir o diretório por `META_QUERY_STATE_DIR` (ele deve existir e ser gravável).

Criação, edição e publicação de campanhas não usam esse cache nem essa repetição automática. A proteção reduz a carga gerada por estes coletores; não aumenta a cota da Meta nem controla integrações externas que usem o mesmo aplicativo.

## Validação sem chamadas reais à Meta

`node --test "Dashboard Meta Ads/meta-query-policy.test.cjs" "Dashboard Meta Ads/personal-meta.test.cjs" tests/meta-query-browser-policy.cjs`

Na pasta `Meta Ads Monitor`: `python -m unittest test_meta_query_guard test_personal_report test_result_metrics test_account_credentials`

Cobertura: deduplicação, isolamento de usuários/conexões, expiração, atualização manual, fila, limite de memória, falhas parciais, cancelamento após desconexão, resposta 429, pausa entre processos e preservação das métricas e paginação.
