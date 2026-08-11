# Feature Specification: Gerenciar linhas de campanhas no PNG

**Feature Branch**: `main`  
**Created**: 2026-08-11  
**Status**: Ready

## User Scenarios & Testing

### User Story 1 - Adicionar grupo ao relatório (Priority: P1)

Como usuário que prepara um relatório em PNG, quero adicionar uma nova linha no bloco de campanhas para informar nome, leads e CPL que deverão aparecer somente na arte exportada.

**Independent Test**: abrir um relatório, adicionar uma linha, preencher os três campos e confirmar que ela aparece imediatamente na prévia e no PNG.

**Acceptance Scenarios**:

1. **Given** o editor aberto, **When** o usuário clicar em “Adicionar campanha”, **Then** uma nova linha editável deve aparecer com nome, leads e CPL.
2. **Given** uma nova linha preenchida, **When** a prévia for atualizada, **Then** os valores devem aparecer no bloco de desempenho do PNG.
3. **Given** várias contas no ZIP, **When** uma linha for adicionada em uma conta, **Then** as demais contas não devem ser alteradas.

### User Story 2 - Remover e restaurar grupo (Priority: P1)

Como usuário, quero remover uma linha que não deve aparecer no relatório e poder restaurar a composição auditada original.

**Independent Test**: remover uma linha, verificar sua ausência na prévia e usar “Restaurar dados auditados” para recuperá-la.

**Acceptance Scenarios**:

1. **Given** uma linha existente, **When** o usuário removê-la, **Then** ela deve desaparecer do formulário, da prévia e do PNG.
2. **Given** linhas adicionadas ou removidas, **When** o usuário restaurar os dados auditados, **Then** o conjunto original deve ser recuperado.

### Edge Cases

- O usuário pode remover todas as linhas; o relatório deve continuar exportável sem linhas de campanha.
- Uma linha recém-adicionada começa vazia e permanece claramente editável.
- Nomes longos devem continuar usando o ajuste de texto existente na arte.
- Leads e CPL são edições visuais e não podem substituir os dados auditados armazenados.

## Requirements

### Functional Requirements

- **FR-001**: O editor MUST oferecer uma ação visível “Adicionar campanha” no bloco de desempenho.
- **FR-002**: Cada nova linha MUST conter campos editáveis de nome, leads e CPL.
- **FR-003**: Cada linha MUST poder ser removida individualmente.
- **FR-004**: Adições, edições e remoções MUST atualizar a prévia da conta atual.
- **FR-005**: As alterações MUST permanecer isoladas por conta durante a preparação do ZIP.
- **FR-006**: A restauração MUST recuperar os grupos originais retornados pela auditoria.
- **FR-007**: Alterações do PNG MUST NOT modificar os dados auditados da Meta.

## Assumptions

- “Adicionar uma nova coluna” significa adicionar uma nova linha/grupo no quadro “Nome / Leads / CPL”.
- A nova linha é uma personalização temporária da exportação atual.
- O usuário é responsável pelos valores manuais incluídos na arte.

## Success Criteria

- **SC-001**: O usuário consegue adicionar ou remover uma linha em até dois cliques.
- **SC-002**: A prévia reflete a alteração em menos de um segundo após a interação.
- **SC-003**: Em um lote com múltiplas contas, 100% das alterações permanecem associadas somente à conta editada.
- **SC-004**: A restauração recupera 100% das linhas auditadas originais.
