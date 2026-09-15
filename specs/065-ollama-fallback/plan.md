# Plano

1. Adicionar configuração de Groq e Ollama ao planejador de campanhas.
2. Reutilizar a validação existente para qualquer resposta de IA.
3. Cobrir a prioridade e o fallback com testes Node.
4. Instalar Ollama como serviço systemd local na VPS e configurar o modelo `qwen2.5:0.5b`, adequado à CPU disponível e à janela de resposta.
5. Publicar somente o arquivo da API alterado, reiniciar o serviço e validar o endpoint local.
