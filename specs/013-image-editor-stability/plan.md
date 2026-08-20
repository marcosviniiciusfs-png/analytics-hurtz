# Plano técnico

1. Reproduzir a falha com o perfil real e testar separadamente Gemini e FLUX.
2. Corrigir contrato de modelo, timeout, fallback e diagnóstico por provedor.
3. Simplificar o caminho crítico da fila: uma geração de qualidade por slide, validação objetiva leve, tentativa extra somente quando necessária.
4. Tornar aplicação e persistência incrementais, liberando buffers após cada slide.
5. Isolar controles do editor por camada, agendar desenho no próximo frame e postergar persistência e miniaturas.
6. Criar testes reais de cinco imagens, fallback, troca de tela e estresse com imagens grandes.
7. Executar regressão completa, convergir, empacotar e instalar.

## Arquivos principais
- `main.js`: provedores, timeout, cache e operações pesadas fora do renderer.
- `preload.js`: diagnóstico e geração.
- `app.js`: fila, progresso, retry e atualização incremental do editor.
- `runtime-services.js`: agendamento e telemetria.
- `scripts/`: testes E2E e de desempenho.
