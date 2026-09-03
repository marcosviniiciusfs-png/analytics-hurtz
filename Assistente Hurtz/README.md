# Ecossistema Hurtz

O `Hurtz Launcher.exe` reúne três ferramentas independentes:

- **Assistente de Reunião:** aplicação atual para transcrição, respostas, documentos, notas e próximos passos.
- **Atendente WhatsApp:** atendimento humanizado conectado à Evolution API, com memória, documentos, Ollama, texto/áudio e transferência humana.
- **Atendente de Ligação:** arquitetura Pipecat preservada, com desenvolvimento temporariamente pausado.

O Assistente de Reunião ouve o microfone e, através da extensão Hurtz, somente a aba selecionada da reunião. Os canais são transcritos separadamente com Whisper, consultam PDFs internos e alimentam o overlay.

O loopback global do Windows fica desativado. Vídeos, músicas, jogos e notificações de outros aplicativos não entram na transcrição. Instale a extensão uma vez executando `INSTALAR EXTENSAO HURTZ.bat`.

Para instalar em outro computador, comece por `GUIA DE INSTALACAO.md` ou execute `INSTALAR TUDO NO WINDOWS.bat`.

## Identidade visual

O projeto segue a linguagem do CBO/Hurtz: grafite `#171511`, laranja `#e87722`, fundo quente `#f7f5f2`, Manrope para títulos e DM Sans para leitura.

## Instalação no Windows

Pré-requisitos gratuitos: Python 3.10+, Node.js 18+ e Ollama. Execute `instalar-windows.bat`; depois, execute `iniciar.bat`. Coloque os materiais em `knowledge_base/pdfs/`.

Para abrir todo o sistema — backend, áudio, IA e interface — dê dois cliques em `ABRIR ASSISTENTE HURTZ.vbs`. Os processos técnicos ficam ocultos e somente o overlay aparece.

Antes de iniciar uma reunião, a tela de preparação exige:

1. pelo menos um PDF de treinamento;
2. instruções sobre como o assistente deve responder.

Ao clicar em **Preparar e ativar assistente**, os documentos são copiados para `knowledge_base/pdfs`, indexados localmente e a escuta é iniciada.

## Modos de assistência

- **Vendas:** respostas comerciais com foco em valor e conversão.
- **Objeções:** identifica resistências e sugere respostas empáticas.
- **Apresentação:** acompanha semanticamente o PDF e sugere explicações curtas para o apresentador.
- **Reunião:** prioriza decisões, notas, responsáveis e próximos passos.

Durante a fala do usuário, o sistema consolida janelas consecutivas da transcrição e compara o texto com a base de conhecimento. Quando encontra correspondência, mostra o documento, o trecho provável e uma explicação curta que pode ser usada imediatamente.

O instalador baixa modelos grandes (Whisper, embeddings e LLM) na primeira utilização. Tudo permanece na máquina. Nenhuma chave é necessária. Para ocultar/exibir o overlay, use `Ctrl + Shift + H`.

## macOS/Linux

Crie o venv, instale `backend/requirements.txt`, rode `npm install` dentro de `overlay/`, instale o Ollama e baixe `llama3.2:3b`. No macOS, é necessária a instalação manual do BlackHole 2ch e a criação de um dispositivo agregado. Depois, rode `./iniciar.sh`.

## Testes

```text
venv\\Scripts\\python.exe -m unittest tests/smoke_test.py
cd overlay && npm run smoke
```

Os testes de hardware descritos no plano devem ser feitos após a instalação: captura de 5 segundos de cada canal, transcrição de áudio real, consulta de um PDF, chamada ao Ollama, compartilhamento de tela observado em outro dispositivo e medição do ciclo completo.

## Privacidade e uso responsável

Use somente em treinamento interno, estudo e apoio à própria fala, com conhecimento/consentimento apropriado. O processamento padrão é local. O overlay não grava nem envia dados para nuvem.

## Limitações conhecidas

- Em CPU, o ciclo pode passar de 3–5 segundos; modelos menores reduzem a latência.
- A separação de falantes é por canal (microfone/sistema), não distingue várias pessoas remotas.
- No macOS, permissões de Acessibilidade/Gravação de Tela podem ser necessárias.
- `setContentProtection(true)` cobre os casos comuns, mas não garante invisibilidade contra todo software corporativo ou captura em nível de sistema.
- Modelos Whisper maiores são mais precisos e mais lentos.
- A opção de APIs pagas está reservada no `.env.example`, desativada por padrão e não é necessária ao funcionamento local.
