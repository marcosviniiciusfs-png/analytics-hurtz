# Feature Specification: Preservar copy explícita

**Feature Branch**: `002-preserve-explicit-copy`
**Created**: 2026-08-11
**Status**: Ready
**Input**: Preservar literalmente copies fornecidas slide a slide, inclusive assunto, dor, desejo, ganho, CTA e destaques, sem permitir que recuperação ou auditoria as transforme em conteúdo genérico.

## User Scenarios & Testing

### User Story 1 - Usar copy fechada sem reescrita (Priority: P1)

Como usuário, ao fornecer blocos numerados por slide e pedir texto exato, quero que cada frase apareça no slide correspondente sem reescrita semântica.

**Why this priority**: A copy é um ativo estratégico pronto; alterá-la destrói a intenção publicitária.

**Independent Test**: Usar o prompt de seis slides sobre libido e comparar títulos, corpos, ordem e CTA com a entrada.

**Acceptance Scenarios**:

1. **Given** um prompt com `[Slide N]` e instrução de manter exatamente, **When** o carrossel é criado, **Then** a quantidade vem dos blocos e o texto limpo de marcação permanece idêntico.
2. **Given** destaques entre `**`, **When** os cards são montados, **Then** as expressões são preservadas como metadados de destaque.
3. **Given** uma auditoria de tamanho ou estilo, **When** ela encontra risco visual, **Then** ajusta tipografia/layout e nunca substitui a copy.

### User Story 2 - Continuar escrevendo briefings abertos (Priority: P2)

Como usuário que fornece apenas uma ideia, quero que a IA continue criando Hook, corpo e CTA fortes sem ser confundida com o modo de copy fechada.

**Why this priority**: A correção não pode remover a geração assistida existente.

**Independent Test**: Um prompt curto sem blocos continua passando pelo gerador de copy.

**Acceptance Scenarios**:

1. **Given** um tema curto sem slides explícitos, **When** o carrossel é criado, **Then** a IA produz a progressão narrativa normalmente.

### Edge Cases

- O número selecionado na interface difere da quantidade de blocos explícitos.
- Um bloco contém aspas, emoji, quebras de linha ou `CTA` no rótulo.
- O texto ultrapassa a área segura: o sistema reduz fonte e redistribui espaço, sem cortar palavras.
- O usuário fornece blocos, mas autoriza explicitamente reescrita; nesse caso permanece modo aberto.

## Requirements

### Functional Requirements

- **FR-001**: O sistema MUST detectar copy fechada por blocos de slide e instrução inequívoca de preservação.
- **FR-002**: O sistema MUST extrair a quantidade, ordem, rótulo, título, corpo e destaques de cada bloco.
- **FR-003**: Em copy fechada, o sistema MUST ignorar o número selecionado e usar a quantidade de blocos válidos.
- **FR-004**: Em copy fechada, humanização, recuperação e auditoria MUST NOT reescrever título ou corpo.
- **FR-005**: A auditoria de copy MUST registrar alertas informativos sem bloquear ou alterar copy fechada.
- **FR-006**: Ajustes automáticos em copy fechada MUST se limitar a fonte, tamanho, posição, layout e metadados visuais.
- **FR-007**: O último bloco explícito MUST preservar o CTA e o produto fornecidos.
- **FR-008**: Expressões entre `**` MUST ser preservadas e destacadas, inclusive no corpo.
- **FR-009**: Prompts abertos MUST conservar o pipeline de escrita e autocorreção existente.
- **FR-010**: A correção MUST possuir teste de regressão com a copy de libido fornecida pelo usuário.

## Success Criteria

- **SC-001**: 100% das frases do prompt de regressão aparecem no slide correto após remover somente a marcação `**`.
- **SC-002**: O carrossel de regressão contém seis slides, mesmo quando a interface estava configurada com cinco.
- **SC-003**: Produto “Libid Intense”, dor, transformação e CTA permanecem presentes.
- **SC-004**: 100% das expressões marcadas permanecem nos metadados de destaque.
- **SC-005**: A suíte completa dos formatos existentes continua aprovada.

## Assumptions

- A primeira linha útil de cada bloco é o título; as demais formam o corpo preservando pontuação e ordem.
- Remover os delimitadores `**` não é considerado reescrita.
- O modo fechado só é ativado quando há ao menos dois blocos válidos e uma instrução explícita de preservação.
