# Fallback local para criação inteligente de campanhas

## Objetivo

Manter a Groq como provedor principal e usar o Ollama local da VPS quando a Groq estiver indisponível, limitada ou retornar uma resposta que não passe na validação do rascunho.

## Requisitos

- A Groq é chamada antes do Ollama.
- O Ollama usa apenas `http://127.0.0.1:11434/api/chat` e não fica exposto à internet.
- Os dois provedores recebem o mesmo contrato de JSON e passam pela mesma validação.
- A interface não recebe detalhes de credenciais ou do provedor; se ambos falharem, recebe uma mensagem neutra e a criação manual continua disponível.
- A VPS executa o Ollama como serviço persistente e baixa o modelo configurado.

## Critérios de aceite

1. Uma resposta válida da Groq não chama o Ollama.
2. Uma falha da Groq chama o Ollama e retorna um rascunho válido.
3. Falhas dos dois provedores não retornam dados inválidos nem segredos.
4. O serviço Ollama escuta somente no loopback da VPS.
