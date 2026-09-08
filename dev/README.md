# Aplicativo local

Abra **http://localhost:8091** depois de iniciar:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File dev/start-local.ps1
```

Ou mantenha `node dev/local-server.cjs` em um terminal. A opção de execução do PowerShell vale apenas para esse processo e não altera a política do Windows. O servidor escuta somente em `127.0.0.1`. Não usa SSH, Supabase de produção ou a API publicada. Nenhuma publicação é feita por esses comandos.

O primeiro acesso abre o espaço de desenvolvimento `local@hurtz.dev`. Para exercitar o isolamento, use **Sair** e cadastre outro usuário pelo formulário local. Senhas usam scrypt; dados, credenciais e anexos ficam no diretório ignorado pelo Git `.codex-tmp/local-data`, com criptografia autenticada. O atalho de desenvolvimento é exclusivo deste servidor local e não representa autenticação de produção.

## Ferramentas

- Contas, análises, relatórios, filtros e planejamentos continuam ligados à conexão Facebook individual.
- Tarefas: etapas, projetos, módulos, ciclos, subtarefas, comentários, anexos e notificações usam armazenamento local por usuário.
- Pesquisa: configure sua credencial Apify. A busca consulta TikTok/Instagram; sessões de pesquisa, downloads, capas, preferências e trabalhos do agente são isolados.
- Biblioteca: salva referências públicas de TikTok/Instagram e aceita a extensão. Não copia o arquivo do vídeo para o banco.
- Comentários: somente contas autorizadas podem ser pesquisadas. A moderação exige um comentário retornado recentemente para o mesmo usuário e conexão; a Meta valida as permissões de página.
- WhatsApp: configure uma Evolution de desenvolvimento e crie uma instância em Alertas. Apenas instâncias criadas no espaço do usuário ficam disponíveis. Configuração, horários, histórico e processamento são locais. O motor roda a cada 15 minutos enquanto o servidor estiver aberto e os alertas estiverem ativados.
- Configurações: credenciais, análise visual, conexões restritas de extensão/agente e diagnóstico.

## Conexões externas

Use **Configurações** para informar Apify e Evolution. Campos vazios de credenciais preservam o valor existente. A tela não devolve os tokens salvos.

O login do Facebook depende da configuração de localhost no aplicativo Meta. A tela também aceita um token de usuário emitido pelo Tryv CRM, validado diretamente na Meta. Ter o token não dispensa as permissões de anúncios ou de páginas necessárias para cada operação.

O teste de WhatsApp da tela é um envio real, confirmado pelo usuário. Os testes automatizados não acionam provedores reais. O modo de validação (`dry_run`) continua disponível para alertas automáticos.

## Python e analisador

Para os relatórios e alertas no Windows:

```powershell
python -m venv .codex-tmp/local-python
.\.codex-tmp\local-python\Scripts\python.exe -m pip install -r dev/requirements-local.txt
```

O iniciador encontra esse Python automaticamente. `LOCAL_PYTHON` permite indicar outro executável.

Para análise visual, instale Ollama, o modelo `qwen2.5vl:3b` e FFmpeg. Gere a conexão de analisador em Configurações, salve o JSON em um arquivo privado fora das pastas públicas e execute:

```powershell
.\dev\start-creative-agent.ps1 -ConfigPath .codex-tmp/local-agent.json
```

Esse iniciador recusa endereços que não sejam localhost. Ele não altera o serviço de agente já existente. A conexão restrita expira em 7 dias e só acessa endpoints do analisador para o usuário que a gerou.

Para a extensão, carregue a pasta **Hurtz TikTok Collector** sem compactação e cole a conexão de extensão gerada em Configurações. Ela só acessa a biblioteca do usuário.

## Verificação

```powershell
node --test tests/local-server.test.cjs "Dashboard Meta Ads/personal-meta.test.cjs"
.\.codex-tmp\local-python\Scripts\python.exe -m unittest discover -s "Meta Ads Monitor" -p "test_*.py"
npm.cmd --prefix dev install
node tests/local-browser.cjs
```

O teste de navegador requer Playwright e Edge/Chromium. Ele utiliza dados temporários e provedores simulados, incluindo respostas de Meta, Apify e Evolution. Os testes verificam acesso indevido entre usuários, anexos, sessões, credenciais, moderação, filas do agente, persistência e navegação. Apagam seus próprios dados temporários ao terminar.

Credenciais reais e a execução de modelos na GPU precisam ser configuradas separadamente; não são simuladas como sucesso na interface normal.
