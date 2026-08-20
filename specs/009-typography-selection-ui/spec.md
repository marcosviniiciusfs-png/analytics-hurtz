# Controles tipográficos por camada e seleção

## User Scenarios & Testing

### User Story 1 — Ajustar título e texto separadamente

O usuário controla espaçamento entre linhas e altura visual do título sem alterar o texto, e vice-versa.

**Acceptance Scenarios**

1. Ao mover o espaçamento do título, somente o título muda.
2. Ao mover a altura do texto, somente o corpo muda.
3. Os valores permanecem salvos ao trocar de slide e reabrir o projeto.

### User Story 2 — Formatar um trecho selecionado

O usuário seleciona um trecho no título ou texto e aplica negrito, itálico, maiúsculas ou minúsculas.

**Acceptance Scenarios**

1. Sem seleção, a ferramenta orienta o usuário e não altera o conteúdo.
2. Com seleção, somente o intervalo selecionado recebe negrito ou itálico.
3. Maiúsculas e minúsculas alteram somente o intervalo e preservam as demais formatações.
4. A interface informa se o estilo da fonte é nativo ou simulado.

### User Story 3 — Usar controles claros e fluidos

Os controles têm hierarquia visual, rótulos compreensíveis, estados de foco/hover/ativo e resposta imediata sem redesenhar painéis inteiros durante o arraste.

## Functional Requirements

- **FR-001**: Separar visualmente os editores de título e texto.
- **FR-002**: Exibir ações nomeadas para negrito, itálico, maiúsculas e minúsculas em cada editor.
- **FR-003**: Exibir tooltip explicando a ação e a compatibilidade da fonte atual.
- **FR-004**: Aplicar estilos somente ao intervalo selecionado.
- **FR-005**: Manter métricas independentes de espaçamento e altura para título e texto.
- **FR-006**: Persistir métricas e intervalos formatados ao duplicar, salvar e reabrir.
- **FR-007**: Usar o estilo nativo quando o arquivo da fonte o oferecer e síntese controlada quando a família não possuir aquela variante.
- **FR-008**: A interação com sliders e botões deve atualizar a prévia sem piscadas ou bloqueios perceptíveis.

## Edge Cases

- Fonte disponível apenas em Regular.
- Fonte disponível apenas em Itálico.
- Seleção atravessando pontuação, acentos ou várias palavras.
- Conversão de caixa que altera o tamanho do intervalo.
- Clique de formatação sem texto selecionado.

## Success Criteria

- **SC-001**: 100% das quatro ações produzem mudança verificável no trecho selecionado.
- **SC-002**: As quatro métricas independentes afetam somente sua camada.
- **SC-003**: Todas as fontes da lista informam sua compatibilidade e exibem negrito/itálico nativo ou simulado.
- **SC-004**: O painel cabe na largura atual do editor sem sobreposição ou botões unidos.
- **SC-005**: A suíte de regressão e a validação do executável instalado passam integralmente.

## Assumptions

- Maiúsculas e minúsculas são transformações do conteúdo, não variantes de arquivo de fonte.
- Famílias que não publicam negrito ou itálico próprios usarão síntese tipográfica explicitamente identificada na interface.

## Follow-up: fidelidade editorial e seletor de cor

- **FR-009**: O canvas deve preservar cada quebra de linha explícita digitada em título ou texto, inclusive linhas vazias entre parágrafos.
- **FR-010**: Todo seletor de cor deve abrir integralmente dentro da viewport, acima de painéis com recorte, permanecer interativo e fechar ao clicar fora.
- **SC-006**: Um teste automatizado deve comprovar as posições verticais distintas das linhas e a abertura do seletor sem recorte.
- **FR-011**: O seletor de cor deve ser aberto diretamente em uma camada global, sem depender da ordem de inicialização dos controles ou do recorte dos cards.
- **FR-012**: Alterações contínuas em Cantos devem atualizar a pré-visualização no máximo uma vez por quadro e adiar persistência e miniaturas até o fim da interação.
- **SC-007**: Digitar nos quatro campos de canto e arrastar a cor não pode produzir mais de uma pintura por quadro nem gravação por evento intermediário.

## Follow-up: exportação ZIP imutável

- **FR-013**: Exportar ZIP deve apenas renderizar uma cópia dos slides no estado atual, compactar os PNGs e solicitar o destino do arquivo.
- **FR-014**: O fluxo de exportação não pode chamar geração, auditoria corretiva, reescrita, humanização ou alteração de estrutura.
- **FR-015**: Título, texto, quantidade, ordem, destaques, posições e demais configurações devem permanecer byte a byte equivalentes antes e depois da exportação.
- **SC-008**: Um teste automatizado deve exportar todos os slides, confirmar nomes sequenciais e comprovar zero alterações no projeto e zero chamadas editoriais.
## Follow-up: cor de fundo consistente em todos os cards

- **FR-016**: A cor escolhida em "Fundo do slide" deve atualizar somente o slide selecionado e ser respeitada por todos os formatos, estruturas e variantes de card.
- **FR-017**: O seletor visual, o campo hexadecimal, o estado persistido e a pre-visualizacao devem sempre representar exatamente a mesma cor.
- **FR-018**: Cards com imagem em conteiner devem preservar a cor escolhida em toda a area externa ao conteiner; imagens de fundo completas podem cobrir a base sem alterar seu valor persistido.
- **FR-019**: Padroes de fundo devem ser desenhados sobre a cor escolhida, sem substituir ou redefinir essa cor.
- **FR-020**: Arrastar o seletor deve limitar a pintura da previa a uma atualizacao por quadro e adiar miniaturas, persistencia e previa vizinha ate a confirmacao.
- **SC-009**: Uma matriz automatizada deve validar estado, controles e pixels de fundo em Minimalista, Profile, Creators, TechViral e Infinito, com e sem imagem em conteiner e com todos os padroes.
## Follow-up: desempenho integral das ferramentas do editor

- **FR-021**: Sombra/Overlay deve responder ao arraste sem travamentos, atualizando no maximo uma vez por quadro e persistindo somente ao final da interacao.
- **FR-022**: Todos os sliders de posicao, dimensao, zoom, tipografia, opacidade e efeitos devem compartilhar o mesmo agendador leve de pre-visualizacao.
- **FR-023**: Digitacao em titulo, texto e campos de cantos deve atualizar a pre-visualizacao sem reconstruir miniaturas, cards vizinhos ou armazenamento a cada tecla.
- **FR-024**: Botoes, seletores, toggles, uploads e acoes destrutivas devem executar uma unica acao por interacao e permanecer responsivos.
- **FR-025**: Uma falha em uma ferramenta nao pode interromper as demais ferramentas nem deixar controles visuais fora de sincronia com o estado do slide.
- **SC-010**: Uma auditoria automatizada deve cobrir todos os controles interativos do editor, comprovar vinculo funcional e limitar eventos continuos a uma pintura por quadro e uma persistencia por confirmacao.
- **SC-011**: A suite completa e a mesma auditoria executada no aplicativo instalado devem passar sem erros.

## Follow-up: desempenho percebido em arrastes reais

- **FR-026**: A auditoria deve simular eventos distribuídos no tempo, como um arraste humano real, e não apenas eventos agrupados no mesmo ciclo.
- **FR-027**: Durante interações contínuas, a pré-visualização deve usar uma superfície proporcional ao tamanho efetivamente exibido, preservando a renderização integral para confirmação e exportação.
- **FR-028**: Sombra/Overlay, cores, cantos, tipografia, recorte e posição não podem acionar pintura de slides vizinhos, miniaturas ou persistência enquanto o ponteiro estiver em movimento.
- **FR-029**: Ao finalizar a interação, o canvas integral, as miniaturas, os slides vizinhos e o estado persistido devem convergir uma única vez.
- **SC-012**: Um arraste temporizado de dois segundos deve manter pelo menos 24 atualizações visuais por segundo, sem atrasos de interação acima de 100 ms.
- **SC-013**: A renderização interativa deve processar no máximo 40% dos pixels usados pela exportação integral, sem alterar as dimensões ou a qualidade dos PNGs exportados.
