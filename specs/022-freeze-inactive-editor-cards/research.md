# Research: Congelar cards inativos no editor

## Decision 1: congelar snapshots em vez de redesenhar vizinhos

- **Decision**: manter canvases estáveis e não chamar a renderização dos cards inativos durante o uso dos controles.
- **Rationale**: o fluxo atual recria canvases 1080×1350 para todas as miniaturas e previews após cada commit, causando alocação, pintura e carregamento de imagens desnecessários.
- **Alternatives considered**: debouncing maior apenas adia o travamento; reduzir somente a frequência ainda mantém picos de trabalho; usar uma árvore reativa nova aumentaria o risco e o escopo.

## Decision 2: resolução de preview separada da exportação

- **Decision**: renderizar snapshots laterais em 216×270 e cards vizinhos em 432×540, com escala lógica correspondente.
- **Rationale**: o navegador atualmente desenha 1080×1350 mesmo quando exibe 120×150 ou 432×540.
- **Alternatives considered**: usar imagens exportadas em cache consumiria mais memória e poderia ficar desatualizado.

## Decision 3: consolidar ao sair do card

- **Decision**: o card ativo é marcado como sujo e recebe snapshot final quando a seleção muda.
- **Rationale**: preserva fidelidade sem repintar durante cada movimento do slider.
- **Alternatives considered**: atualização por tempo ocioso pode competir com o scroll e é imprevisível em máquinas lentas.

