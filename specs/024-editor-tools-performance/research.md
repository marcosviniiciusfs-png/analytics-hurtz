# Research: desempenho do editor

## Decision: medir a interface real

- **Decision**: usar Playwright Electron com eventos de ponteiro, teclado, input e scroll.
- **Rationale**: as travadas percebidas dependem do renderer, Canvas e DOM; testes unitários não reproduzem o problema completo.
- **Alternatives considered**: testar somente funções de desenho, insuficiente para detectar bloqueio do scroll e listeners duplicados.

## Decision: isolamento por camada

- **Decision**: aplicar edições contínuas apenas ao canvas ativo e consolidar miniaturas/persistência no fim da interação.
- **Rationale**: evita redesenho de cards inativos e serialização repetida durante cada pixel arrastado.
- **Alternatives considered**: debounce global; reduz frequência, mas mantém trabalho amplo e sensação de atraso.

## UI principles

- Controles mantêm estados acessíveis de hover, focus, active e disabled.
- Sliders não capturam o scroll fora do arraste.
- Popovers de cor fecham por clique externo ou Escape.
- Nenhuma nova dependência visual será adicionada ao Electron atual.

## Gargalos encontrados na execução real

- Os portais dos seletores de cor permaneciam posicionados sobre a interface depois de fechados. Embora invisíveis, ainda recebiam eventos de ponteiro e bloqueavam cliques e rolagem das ferramentas abaixo deles.
- Os campos de texto dos cantos executavam duas rotas de confirmação, causando atualização secundária redundante.
- A correção torna portais fechados inertes com `visibility: hidden` e `pointer-events: none`, fecha todos os portais por clique externo ou Escape e consolida cantos pelo mesmo agendador leve usado pelo restante do editor.

## Resultado medido

- 91 interações reais pelo Playwright, cobrindo 139 controles vinculados.
- p95 de 105 ms e máximo de 131 ms nas ações discretas.
- 0 long tasks e 0 erros JavaScript no renderer.
- 0 redesenhos de cards inativos durante a edição; os 2 redesenhos totais ocorreram somente na troca intencional de slide.
- Arrastes de 24 passos permaneceram responsivos sem bloquear o scroll; o tempo total observado pelo Playwright ficou entre 344 ms e 355 ms por gesto completo.
- A repetição da suíte no executável instalado 1.60.10 aprovou 2/2 cenários, com p95 de 115 ms e máximo de 127 ms para o ciclo completo das ações discretas; as 100 atualizações internas contínuas foram processadas em 1,4 ms no total.
