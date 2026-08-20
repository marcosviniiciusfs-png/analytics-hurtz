# Data Model: Congelar cards inativos no editor

## Preview Snapshot

- `slideId`: identidade estável do slide.
- `canvas`: instância visual reutilizada.
- `revision`: revisão consolidada atualmente exibida.
- `dirty`: indica que o card ativo mudou desde a última consolidação.
- `role`: `thumbnail` ou `peek`.

## Preview Registry

- `activeSlideId`: slide atualmente editável.
- `structureKey`: ordem dos IDs dos slides.
- `thumbnailSnapshots`: snapshots da lista lateral.
- `peekSnapshots`: snapshots da faixa principal.
- `metrics`: pinturas ativas, snapshots consolidados, reconstruções estruturais e repinturas evitadas.

## State Transitions

1. `editing`: atualiza o canvas principal e marca o slide ativo como sujo.
2. `selection-change`: consolida o slide anterior, troca o ativo e reconcilia classes/ordem.
3. `structure-change`: remove snapshots órfãos, cria novos e atualiza a ordem.
4. `export`: ignora snapshots e usa a renderização final integral.

