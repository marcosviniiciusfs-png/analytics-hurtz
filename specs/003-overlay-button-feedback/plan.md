# Plano: overlay independente e botoes responsivos

## Contexto tecnico

Aplicacao Electron/JavaScript com renderizacao Canvas 2D e CSS global.

## Implementacao

1. Centralizar a ordem visual na funcao final `draw`.
2. Aplicar `drawImageOverlay` em todos os caminhos, inclusive sem imagem e erro de carregamento.
3. Manter `drawSmartAware` depois do overlay para proteger textos e acessorios.
4. Adicionar estados globais de interacao usando propriedades individuais de transformacao para nao sobrescrever transforms existentes.
5. Adicionar teste E2E que instrumenta a ordem das camadas e inspeciona estilos computados.

## Validacao

- Teste dedicado em Electron.
- Suite completa do projeto.
- Build e execucao do pacote instalado.
