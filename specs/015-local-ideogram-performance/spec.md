# Feature Specification: Ideogram 4 local com diagnóstico de desempenho

**Feature Branch**: `015-local-ideogram-performance`
**Created**: 2026-08-13
**Status**: Draft
**Input**: Usar o repositório local do Ideogram 4 para uso pessoal, exibir o modelo gerador fora de cada card e eliminar gargalos da geração.

## User Scenarios & Testing

### User Story 1 - Gerar imagens localmente (Priority: P1)

Ao solicitar imagens, o usuário recebe imagens do Ideogram 4 executado no próprio computador, sem depender de créditos ou chave externa.

**Why this priority**: É o objetivo principal e garante funcionamento privado e previsível.
**Independent Test**: Gerar uma imagem de teste e comprovar que o arquivo foi produzido pelo motor local e inserido no slide.

**Acceptance Scenarios**:
1. **Given** o motor instalado e imagens habilitadas, **When** o carrossel é criado, **Then** cada slide elegível entra na fila e recebe uma imagem local.
2. **Given** memória insuficiente ou dependência ausente, **When** a geração começa, **Then** o sistema informa exatamente o problema e não fica travado em 0%.

### User Story 2 - Entender o tempo de geração (Priority: P1)

O usuário acompanha fases e tempos reais da preparação, inferência, auditoria e salvamento.

**Why this priority**: A interface atual aparenta travamento e não permite localizar a demora.
**Independent Test**: Executar uma fila e verificar métricas por fase, atualização de progresso e conclusão sem bloquear o editor.

**Acceptance Scenarios**:
1. **Given** uma geração ativa, **When** a fase muda, **Then** progresso e tempo decorrido são atualizados imediatamente.
2. **Given** uma etapa lenta, **When** termina, **Then** seu tempo fica registrado no diagnóstico do slide.

### User Story 3 - Identificar o modelo de cada imagem (Priority: P2)

O usuário vê no canto superior direito, acima e fora de cada card, qual modelo produziu sua imagem.

**Why this priority**: Facilita auditoria de qualidade e comparação entre motores.
**Independent Test**: Renderizar slides com imagem local, fallback e imagem manual e validar o rótulo correspondente.

**Acceptance Scenarios**:
1. **Given** uma imagem gerada, **When** o card aparece no editor, **Then** um rótulo externo informa o modelo exato.
2. **Given** um slide sem imagem ou com upload manual, **When** o card aparece, **Then** nenhum modelo de IA incorreto é atribuído.

### Edge Cases

- GPU com apenas 8 GB não comporta o modelo inteiro em precisão integral.
- Primeiro uso exige download e carregamento mais demorado que usos seguintes.
- A auditoria pode rejeitar uma imagem e iniciar nova tentativa; o tempo deve ser separado da inferência original.
- O editor pode ser fechado durante uma fila; nenhum processo órfão deve continuar indefinidamente.
- Slides sem imagem não devem exibir um rótulo de modelo.

## Requirements

### Functional Requirements

- **FR-001**: O sistema MUST oferecer Ideogram 4 local como provedor principal para uso pessoal.
- **FR-002**: O sistema MUST verificar GPU, memória, arquivos e dependências antes de iniciar uma fila.
- **FR-003**: O sistema MUST evitar estado indefinido em 0% e apresentar falha acionável em até 15 segundos quando o motor não puder iniciar.
- **FR-004**: O sistema MUST medir separadamente preparação, carregamento, inferência, auditoria e persistência.
- **FR-005**: O sistema MUST reutilizar o processo e o modelo carregado entre imagens da mesma fila quando suportado pelo motor.
- **FR-006**: O sistema MUST limitar concorrência conforme a memória disponível sem bloquear interações do editor.
- **FR-007**: O sistema MUST persistir em cada imagem o identificador real do modelo que a produziu.
- **FR-008**: O editor MUST mostrar o modelo no canto superior direito, acima e fora do card.
- **FR-009**: Imagens manuais MUST ser identificadas como upload, não como IA.
- **FR-010**: O sistema MUST manter auditoria contra texto, colagem e repetição sem executar trabalho duplicado desnecessário.
- **FR-011**: O sistema MUST preservar o fallback existente caso o motor local não seja executável no hardware atual.
- **FR-012**: O sistema MUST registrar a causa do fallback e nunca rotular a imagem com um modelo diferente do realmente usado.

### Key Entities

- **Image provenance**: modelo, provedor, modo local/remoto, data e motivo de fallback.
- **Generation timing**: tempos de preparação, carregamento, inferência, auditoria, persistência e total.
- **Local engine status**: hardware, arquivos, dependências, compatibilidade e estado carregado.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Uma impossibilidade de inicialização aparece em até 15 segundos com causa explícita.
- **SC-002**: Durante geração, o progresso visual muda pelo menos uma vez a cada 5 segundos.
- **SC-003**: 100% das imagens geradas exibem o modelo real, sem atribuição falsa em uploads manuais.
- **SC-004**: Ajustes no editor permanecem responsivos durante toda a fila.
- **SC-005**: O diagnóstico identifica a etapa dominante e seu percentual do tempo total.
- **SC-006**: O modelo é carregado no máximo uma vez por fila quando o backend permitir reutilização.

## Assumptions

- A ferramenta é usada pessoalmente e não será distribuída para finalidade comercial.
- O computador alvo possui uma RTX 4060 Ti com 8 GB de VRAM.
- O armazenamento local disponível é suficiente para pesos quantizados e caches.
- Se a variante oficial não couber em 8 GB, o sistema deve recusar de forma clara ou usar fallback; não deve congelar o computador.
