# Arquitetura adaptada — Atendente Humanizado WhatsApp

## Intenção

Criar um atendente de WhatsApp natural e controlável dentro do ecossistema Hurtz, reutilizando a Evolution API hospedada na VPS. O módulo de ligações está pausado e não participa desta execução.

## Decisões

- Não criar outra sessão Baileys: usar a instância da Evolution já existente.
- Manter o cérebro independente do conector para permitir migração futura para Cloud API.
- Usar Ollama local como LLM padrão.
- Usar Gemini apenas para transcrição/TTS quando uma chave for configurada.
- Começar com SQLite e debounce em memória para uma instância.
- Migrar para PostgreSQL/pgvector e Redis antes de escalar horizontalmente.
- Começar desativado e testar primeiro com um número secundário.
- Nunca fingir ser uma pessoa se o cliente perguntar diretamente sobre automação.

## Fluxo

```text
WhatsApp
  ↓
Evolution API na VPS
  ↓ MESSAGES_UPSERT
Webhook Hurtz
  ↓
Deduplicação → debounce → transcrição opcional
  ↓
Histórico SQLite + busca na base de conhecimento
  ↓
Ollama
  ↓
Decisão texto/áudio
  ↓
Presença composing/recording
  ↓
Evolution API → cliente
```

## Segurança de ativação

O arquivo `config/assistant.json` mantém `enabled: false` inicialmente. Os testes automatizados usam somente clientes simulados. Nenhum teste exige instância, chave ou número real da Evolution.

## Próximas camadas

1. Configurar a URL e chave administrativa da Evolution no backend Hurtz.
2. Publicar o webhook por HTTPS.
3. Criar a primeira instância pelo painel e ler o QR com um número dedicado.
4. Adicionar ingestão de PDF e embeddings.
5. Validar Gemini TTS e nota de voz OGG/Opus localmente.
6. Somente com autorização explícita, testar mensagens em número secundário controlado.
