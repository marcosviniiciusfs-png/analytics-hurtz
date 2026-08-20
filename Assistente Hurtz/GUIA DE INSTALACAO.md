# Guia de instalação — Assistente Hurtz

Este roteiro é para Windows 10/11 de 64 bits. A inclusão dos PDFs é propositalmente a última etapa.

## 1. Baixar o projeto

Baixe e extraia o arquivo `Assistente Hurtz - Pacote de Instalação.zip`. Não execute os arquivos diretamente de dentro do ZIP: clique com o botão direito, escolha **Extrair Tudo** e abra a pasta extraída.

## 2. Instalação automática recomendada

Dentro da pasta extraída, dê dois cliques em:

`INSTALAR TUDO NO WINDOWS.bat`

O instalador configura, nesta ordem:

1. Python 3.12;
2. Node.js LTS;
3. Ollama;
4. ambiente Python e bibliotecas do Whisper/RAG;
5. Electron e interface visual;
6. modelo local `llama3.2:3b`.

Mantenha a internet conectada. A instalação pode baixar vários gigabytes e demorar, principalmente nas etapas Python e Ollama. Se o Windows solicitar permissão, aceite. Se o antivírus perguntar sobre os arquivos `.bat`, permita a execução somente se o pacote veio da fonte esperada.

## 3. Links oficiais para instalação manual

Use estes links somente se o instalador automático não funcionar:

- Python 3.12 para Windows: https://www.python.org/downloads/
- Node.js LTS: https://nodejs.org/en/download
- Ollama para Windows: https://ollama.com/download/windows
- Instalador de Aplicativo/winget: https://apps.microsoft.com/detail/9nblggh4nns1

Na instalação manual do Python, mantenha o Python Launcher habilitado. No Node.js, instale a versão LTS de 64 bits. Depois de instalar os três programas, reinicie o Windows e execute `instalar-windows.bat`.

## 4. Abrir e conferir a interface

Para visualizar apenas a janela do projeto:

`ABRIR INTERFACE.bat`

É normal aparecer “Backend desconectado” nesse modo, pois somente a interface foi aberta.

Para iniciar áudio, transcrição, busca e geração de resposta:

`ABRIR ASSISTENTE COMPLETO.bat`

Na primeira execução completa, o Whisper baixa automaticamente seu modelo. Esse download acontece apenas uma vez.

## 5. Permissões e teste inicial

1. Autorize o acesso ao microfone se o Windows solicitar.
2. Deixe uma saída de som e um microfone definidos como padrão no Windows.
3. Abra o Assistente completo.
4. Reproduza algum áudio e faça uma pergunta pelo microfone.
5. Confira se a pergunta aparece no overlay.

O atalho `Ctrl + Shift + H` oculta ou mostra o overlay.

## 6. Última etapa: adicionar os PDFs

Somente depois que a interface e o áudio estiverem funcionando, copie os PDFs de treinamento para:

`knowledge_base\pdfs`

Com o Assistente completo aberto, novos PDFs são detectados e indexados automaticamente. Depois, faça perguntas cujo conteúdo esteja no material para validar as respostas.

## Observações

- O sistema roda localmente e não exige chave de API.
- O processamento pode ser mais lento em computadores sem GPU compatível.
- A proteção do overlay cobre os casos comuns, mas deve ser validada em Zoom, Meet ou Teams por outro dispositivo.
- Use o assistente somente em treinamentos e situações com consentimento apropriado.
