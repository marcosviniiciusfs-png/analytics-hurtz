# Feature Specification: Congelar cards inativos no editor

**Feature Branch**: `022-freeze-inactive-editor-cards`  
**Created**: 2026-08-13  
**Status**: Draft  
**Input**: Preservar e travar todos os cards que não estão selecionados para edição, evitando travamentos das ferramentas e do scroll.

## User Scenarios & Testing

### User Story 1 - Editar somente o card selecionado (Priority: P1)

Como usuário do editor, quero que Fundo do slide, Sombra/Overlay e os demais controles atualizem somente o card selecionado, para arrastar os controles sem travar o editor ou o scroll.

**Why this priority**: A edição é a atividade principal e hoje pode bloquear toda a interface.

**Independent Test**: Abrir cinco cards, arrastar continuamente Fundo do slide e Sombra/Overlay no card ativo e confirmar que somente ele muda e que os outros quatro não são redesenhados.

**Acceptance Scenarios**:

1. **Given** um carrossel com cinco cards, **When** o usuário arrasta um controle no card 2, **Then** apenas o card 2 é atualizado durante o gesto.
2. **Given** quatro cards não selecionados visíveis, **When** o usuário faz cem atualizações contínuas no card ativo, **Then** os quatro cards preservam a mesma imagem e a mesma instância visual.
3. **Given** um arraste contínuo, **When** o usuário rola o menu lateral, **Then** o scroll responde sem congelar.

---

### User Story 2 - Trocar de card sem perder a edição (Priority: P1)

Como usuário, quero que o card recém-editado seja preservado ao selecionar outro card, para navegar pelo carrossel sem perder ou atrasar alterações.

**Why this priority**: O congelamento não pode deixar previews desatualizados depois da troca de seleção.

**Independent Test**: Alterar o card 1, selecionar o card 2 e confirmar que o snapshot do card 1 é atualizado uma única vez e o card 2 passa a ser o único editável.

**Acceptance Scenarios**:

1. **Given** alterações pendentes no card 1, **When** o usuário seleciona o card 2, **Then** o card 1 recebe um snapshot final atualizado uma única vez.
2. **Given** o card 2 selecionado, **When** o usuário volta ao card 1, **Then** todas as alterações anteriores aparecem no editor principal.

---

### User Story 3 - Manter operações estruturais corretas (Priority: P2)

Como usuário, quero duplicar, excluir e reordenar cards sem deixar snapshots órfãos ou trocados.

**Why this priority**: Mudanças estruturais são menos frequentes, mas precisam invalidar o conjunto congelado corretamente.

**Independent Test**: Duplicar e apagar um card, verificando contagem, ordem, clique e preview de cada item.

**Acceptance Scenarios**:

1. **Given** cards congelados, **When** um card é duplicado, excluído ou reordenado, **Then** a faixa e a lista lateral refletem a nova estrutura.
2. **Given** uma exportação, **When** o usuário exporta PNG ou ZIP, **Then** a qualidade final permanece integral e não usa as miniaturas congeladas.

### Edge Cases

- Carrossel com apenas um card não cria previews inativos.
- Imagem assíncrona que termina durante um arraste não força repintura dos cards inativos.
- Alternância para carrossel infinito preserva a ordem e as linhas de corte.
- Exclusão do card ativo seleciona um card válido e reconstrói somente a estrutura necessária.
- Um card sem imagem continua recebendo snapshot válido do fundo e dos textos.

## Requirements

### Functional Requirements

- **FR-001**: Durante uma edição contínua, o sistema DEVE atualizar somente a visualização principal do card selecionado.
- **FR-002**: O sistema DEVE preservar a instância visual e o conteúdo renderizado dos cards não selecionados enquanto a seleção não mudar.
- **FR-003**: Ao mudar a seleção, o sistema DEVE consolidar o card anteriormente ativo em um snapshot final antes de tratá-lo como inativo.
- **FR-004**: O sistema DEVE manter miniaturas e previews inativos em resolução adequada à exibição, sem renderizá-los internamente no tamanho final de exportação.
- **FR-005**: Mudanças estruturais — adicionar, duplicar, excluir ou reordenar — DEVEM invalidar e reconstruir apenas a estrutura de previews necessária.
- **FR-006**: A exportação PNG e ZIP DEVE continuar usando a renderização final em resolução integral.
- **FR-007**: Fundo do slide, Sombra/Overlay, tipografia, posição e demais ferramentas DEVEM alterar apenas o estado do card selecionado.
- **FR-008**: O scroll do painel lateral e da área de cards DEVE permanecer utilizável durante alterações contínuas.
- **FR-009**: O sistema DEVE expor métricas de diagnóstico para contar atualizações do card ativo, snapshots consolidados e repinturas evitadas.
- **FR-010**: O congelamento NÃO DEVE alterar o resultado visual ou os dados persistidos do card.

## Assumptions

- “Travar” significa congelar somente a representação visual dos cards inativos, não bloquear seleção, duplicação, exclusão ou exportação.
- O preview inativo pode usar resolução menor porque não é o arquivo exportado.
- A consolidação ocorre ao trocar de card ou fazer uma alteração estrutural, não a cada passo de um slider.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Cem atualizações contínuas em um controle geram zero repinturas dos cards não selecionados.
- **SC-002**: O scroll responde em até 50 ms durante uso contínuo de Fundo do slide e Sombra/Overlay no cenário de cinco cards.
- **SC-003**: Ao trocar a seleção, o card anterior é consolidado no máximo uma vez.
- **SC-004**: Miniaturas e previews inativos usam no máximo 40% das dimensões de exportação em cada eixo.
- **SC-005**: Duplicar, excluir e reordenar mantém 100% dos previews associados ao card correto.
- **SC-006**: PNG e ZIP preservam as dimensões e a aparência final existentes antes da otimização.

