# Feature Specification: Tipografia individual por camada

## User Scenarios & Testing

### User Story 1 - Ajustar título e texto separadamente (Priority: P1)

O usuário controla o espaçamento entre linhas e a altura visual do título sem alterar o texto, e vice-versa.

### User Story 2 - Formatar somente a seleção (Priority: P1)

O usuário seleciona uma palavra ou trecho no campo de título ou texto e aplica negrito, itálico, maiúsculas ou minúsculas somente à seleção.

## Acceptance Scenarios

1. Alterar o espaçamento ou altura do título não muda os valores do texto.
2. Alterar o espaçamento ou altura do texto não muda os valores do título.
3. Negrito e itálico ficam salvos como formatação da faixa selecionada e aparecem no canvas e na exportação.
4. Maiúsculas e minúsculas substituem somente os caracteres selecionados.
5. Sem seleção, os botões não alteram o conteúdo e orientam o usuário a selecionar um trecho.
6. Uma edição textual comum limpa faixas incompatíveis da camada editada para evitar formatação deslocada.

## Requirements

- **FR-001**: Exibir quatro controles independentes: espaçamento e altura do título; espaçamento e altura do texto.
- **FR-002**: Exibir uma barra de formatação junto a cada campo textual.
- **FR-003**: Aplicar negrito e itálico somente à faixa selecionada.
- **FR-004**: Aplicar maiúsculas e minúsculas somente à faixa selecionada.
- **FR-005**: Persistir e duplicar as configurações tipográficas e faixas formatadas.
- **FR-006**: Renderizar as configurações no preview e na exportação.

## Success Criteria

- **SC-001**: Os quatro controles alteram somente a camada correspondente em 100% dos testes.
- **SC-002**: A formatação de seleção não modifica caracteres fora da faixa.
- **SC-003**: Preview e exportação usam os mesmos dados tipográficos.
