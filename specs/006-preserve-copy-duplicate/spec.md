# Feature Specification: Preservação de copy e duplicação integral

## User Scenarios & Testing

### User Story 1 - Preservar uma copy que já cabe (Priority: P1)

Ao fornecer blocos identificados por slide, o usuário recebe o texto original sem reescrita quando cada bloco cabe nos limites editoriais do card.

**Acceptance Scenarios**

1. **Given** dois ou mais blocos `[Slide N]` com título de até 24 palavras, corpo de até 45 palavras e até 60 palavras no total, **When** o carrossel é criado, **Then** título, corpo, ordem, pontuação e destaques são preservados sem chamada ao modelo de reescrita.
2. **Given** um bloco que excede os limites do card, **When** o carrossel é criado, **Then** o pipeline pode compactar somente o necessário, preservando sentido, fatos e função narrativa.
3. **Given** uma copy curta e válida, **When** a auditoria é executada, **Then** ela não substitui o texto.

### User Story 2 - Duplicar um slide completo (Priority: P1)

O usuário duplica o slide selecionado e recebe um novo slide imediatamente depois, contendo todas as propriedades visuais, textuais, imagens, badge, destaques, posições e efeitos do original.

**Acceptance Scenarios**

1. **Given** um slide configurado, **When** o usuário clica em Duplicar, **Then** um novo slide completo é inserido após o original e selecionado.
2. **Given** o slide duplicado, **When** o usuário altera propriedades aninhadas nele, **Then** o original permanece inalterado.
3. **Given** a duplicação, **When** o carrossel é renderizado, **Then** contadores e indicadores refletem a nova quantidade.

## Edge Cases

- Blocos sem título ou corpo não entram na preservação automática.
- Um único bloco não é interpretado como carrossel fechado.
- A duplicação suporta imagens em data URL e configurações aninhadas sem referências mutáveis compartilhadas.

## Requirements

- **FR-001**: Reconhecer dois ou mais blocos numerados por slide como copy estruturada.
- **FR-002**: Preservar literalmente blocos com título de até 24 palavras, corpo de até 45 palavras e até 60 palavras no total.
- **FR-003**: Só acionar reestruturação quando algum bloco ultrapassar os limites ou estiver inválido.
- **FR-004**: A auditoria não deve reescrever slides preservados.
- **FR-005**: A duplicação deve realizar cópia profunda de todas as propriedades.
- **FR-006**: O duplicado deve ser inserido após o original, selecionado e corretamente renumerado.

## Assumptions

- Os limites atuais de 14 palavras no título e 45 no corpo são a capacidade editorial segura dos layouts.

## Success Criteria

- **SC-001**: 100% das copies estruturadas dentro dos limites permanecem idênticas após geração e auditoria.
- **SC-002**: 100% das propriedades do original estão presentes no duplicado.
- **SC-003**: Alterar dados aninhados do duplicado nunca altera o original.
- **SC-004**: Testes automatizados cobrem preservação, excesso e duplicação profunda.
