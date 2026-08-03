# Hurtz Creative Analyzer

Agente local para auditar vídeos temporários do Analytics Hurtz com a GPU do computador.

- não grava vídeos no banco;
- usa diretório temporário e o apaga ao final de cada análise;
- processa um vídeo por vez;
- envia ao Analytics apenas aprovação, categoria, confiança e justificativa;
- inicia automaticamente no login do Windows.

O modelo utilizado é `qwen2.5vl:3b` pelo Ollama. FFmpeg extrai até seis quadros do vídeo.

Durante um lote, o modelo permanece na GPU por cinco minutos para acelerar os vídeos seguintes. Depois disso, o Ollama libera a memória automaticamente.
