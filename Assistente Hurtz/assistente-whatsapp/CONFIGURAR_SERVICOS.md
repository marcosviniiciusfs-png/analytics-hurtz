# Configurar Cloudflare e Google AI Studio

## Cloudflare

O Hurtz utiliza uma infraestrutura exclusiva na conta Cloudflare:

- Worker `hurtz-assistente-api` para sincronização privada;
- D1 `hurtz-assistente-db` para documentos, mensagens e memória;
- Vectorize `hurtz-assistente-knowledge` para busca semântica;
- pasta local `data/knowledge-pdfs/` para os PDFs originais.

As credenciais do OAuth ficam no armazenamento seguro do Wrangler. O backend utiliza um token próprio em `CLOUDFLARE_SYNC_TOKEN`; esse token nunca é enviado ao navegador.

O R2 não faz parte desta instalação. Faça backup periódico da pasta de PDFs no computador local. O PDF original nunca é enviado à Cloudflare nem à VPS; somente o texto extraído e os vetores são sincronizados.

## Google AI Studio

Crie ou substitua a chave em **https://aistudio.google.com/apikey** e salve-a somente no `.env`:

```env
GEMINI_API_KEY=SUA_CHAVE
TTS_MODEL=gemini-3.1-flash-tts-preview
TTS_VOICE_NAME=Kore
FFMPEG_PATH=ffmpeg
```

O SDK do Google e o FFmpeg já estão instalados. Sem uma chave válida, o atendimento retorna para texto automaticamente.
