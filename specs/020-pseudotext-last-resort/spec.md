# Feature Specification: Pseudotexto como último recurso

**Created**: 2026-08-13  
**Status**: In progress

## User Scenarios & Testing

### User Story 1 - Concluir o carrossel após quatro tentativas (Priority: P1)

Quando as quatro imagens candidatas de um slide contêm apenas pseudotexto, mas a última imagem continua coerente com a copy, não é repetida e não é uma colagem, o usuário recebe essa última imagem no slide em vez de ficar com uma pendência permanente.

**Acceptance Scenarios**:

1. **Given** quatro candidatas recusadas somente por pseudotexto, **When** a quarta auditoria termina, **Then** a última candidata é aplicada e marcada para revisão.
2. **Given** uma candidata desconectada da copy, repetida ou em colagem, **When** as tentativas terminam, **Then** ela continua bloqueada.
3. **Given** uma candidata aprovada sem texto antes da quarta tentativa, **When** a auditoria termina, **Then** ela é aplicada normalmente e não recebe aviso de revisão.

## Requirements

- **FR-001**: O sistema MUST manter a proibição de pseudotexto nas quatro tentativas normais.
- **FR-002**: Após quatro falhas exclusivamente por pseudotexto, o sistema MUST aplicar a última candidata semanticamente coerente.
- **FR-003**: A candidata de último recurso MUST estar livre de colagem, repetição, falha de contexto e erro de contrato.
- **FR-004**: A imagem aplicada como último recurso MUST ficar marcada como `needsReview` e preservar os dados de OCR.
- **FR-005**: A interface MUST contabilizar o slide como concluído, sem esconder o aviso de revisão.
- **FR-006**: A copy exibida no card MUST permanecer inalterada; somente a orientação enviada ao gerador usa a interpretação visual.

## Success Criteria

- **SC-001**: O teste com quatro candidatas contendo somente pseudotexto termina com uma imagem aplicada na quarta tentativa.
- **SC-002**: Os testes confirmam que colagem, repetição e desconexão semântica nunca entram pelo último recurso.
- **SC-003**: A geração normal sem pseudotexto mantém o comportamento atual.

## Assumptions

- “Pseudotexto” inclui letras ou palavras defeituosas detectadas por OCR ou auditoria semântica.
- A última candidata elegível é usada porque já incorpora a correção mais rigorosa do prompt.
