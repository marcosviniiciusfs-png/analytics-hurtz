# Feature Specification: Conter falhas internas da geração de copy

**Feature Branch**: `031-copy-error-containment`

**Created**: 2026-08-15

**Status**: Ready

**Input**: Impedir que mensagens técnicas, erros do modelo ou diagnósticos internos sejam transformados em conteúdo do carrossel quando a geração local falhar.

## User Scenarios & Testing

### User Story 1 - Receber conteúdo sobre o assunto solicitado (Priority: P1)

Como usuário, quero que uma falha temporária do modelo seja recuperada sem transformar o erro técnico no tema do carrossel.

**Why this priority**: Exibir “modelo retornou resposta vazia”, logs ou instruções de suporte como copy cria um carrossel completamente diferente do pedido.

**Independent Test**: Simular uma primeira resposta vazia e respostas de recuperação que tentem falar sobre backend, logs e modelo. O resultado final deve continuar ligado ao assunto original e não pode conter nenhum diagnóstico interno.

**Acceptance Scenarios**:

1. **Given** uma primeira resposta vazia do modelo, **When** a recuperação contextual começa, **Then** a mensagem técnica não é incluída no material enviado para criação da copy.
2. **Given** uma resposta posterior que transforma a falha em conteúdo, **When** a copy é validada, **Then** ela é rejeitada e outra recuperação segura é usada.
3. **Given** três respostas inválidas, **When** as tentativas terminam, **Then** o sistema cria um rascunho seguro a partir do assunto original, sem mencionar a falha interna.

---

### User Story 2 - Manter falhas técnicas apenas no diagnóstico (Priority: P2)

Como usuário, quero que problemas do modelo apareçam somente como aviso compreensível, sem contaminar slides, legenda, direção visual ou imagens.

**Why this priority**: O usuário precisa saber que houve recuperação, mas essa informação não pertence ao conteúdo publicado.

**Independent Test**: Forçar a falha inicial e confirmar que o relatório de recuperação registra um código técnico, enquanto títulos, corpos e direção visual não contêm a mensagem de erro.

**Acceptance Scenarios**:

1. **Given** uma falha interna, **When** o carrossel é entregue pelo modo seguro, **Then** o estado registra que houve recuperação sem guardar o texto bruto do erro como assunto editorial.
2. **Given** um tema realmente relacionado a tecnologia, **When** palavras como sistema ou servidor fazem parte do pedido original, **Then** elas não são removidas apenas por parecerem técnicas.

### Edge Cases

- O assunto informado é curto ou genérico.
- O usuário realmente pede um carrossel sobre erros de software.
- A resposta contém parte do tema correto e parte de um diagnóstico interno.
- O modelo devolve JSON válido com quantidade correta de slides, mas com conteúdo técnico indevido.
- O cache contém uma resposta antiga contaminada por diagnóstico.
- Todas as tentativas do modelo retornam vazias ou inválidas.

## Requirements

### Functional Requirements

- **FR-001**: O sistema MUST NOT inserir mensagens brutas de exceção, falhas do modelo, logs, backend, configuração ou suporte técnico nos prompts de recuperação editorial.
- **FR-002**: O sistema MUST distinguir o assunto original de metadados internos de recuperação usando limites explícitos.
- **FR-003**: O sistema MUST rejeitar uma copy que contenha diagnóstico interno ausente do pedido original.
- **FR-004**: A validação MUST ser aplicada a títulos, corpos, legenda e demais textos gerados antes da montagem dos slides.
- **FR-005**: Uma falha inicial MUST NOT substituir ou alterar o assunto original usado nas tentativas posteriores.
- **FR-006**: Após o limite de tentativas, o sistema MUST produzir um rascunho determinístico baseado somente no pedido original.
- **FR-007**: O rascunho seguro MUST manter a estrutura Hook, desenvolvimento e CTA.
- **FR-008**: O sistema MUST registrar um código de recuperação e uma mensagem amigável separada da copy.
- **FR-009**: Termos técnicos explicitamente presentes no assunto original MUST continuar permitidos.
- **FR-010**: Respostas contaminadas MUST NOT entrar no cache de copy como resultados reutilizáveis.
- **FR-011**: A criação MUST preservar o projeto anterior até existir um novo roteiro válido pronto para ser aplicado.

### Key Entities

- **Assunto editorial original**: pedido do usuário usado como fonte exclusiva de intenção.
- **Diagnóstico interno**: erro técnico, código de recuperação ou detalhe operacional que não pode virar copy.
- **Relatório de recuperação**: código, quantidade de tentativas, uso de fallback e aviso amigável.
- **Rascunho seguro**: roteiro determinístico criado sem depender da resposta inválida.

## Success Criteria

### Measurable Outcomes

- **SC-001**: O caso “modelo retornou resposta vazia” é impedido de aparecer nos slides em 100% dos testes de regressão.
- **SC-002**: Nenhuma resposta contaminada é aceita quando o pedido original não trata de tecnologia.
- **SC-003**: Temas técnicos intencionais continuam válidos em 100% dos casos de controle.
- **SC-004**: O sistema entrega um roteiro seguro após no máximo três tentativas de recuperação.
- **SC-005**: O projeto anterior permanece intacto quando não há novo roteiro válido para aplicar.

## Assumptions

- A falha observada foi causada pelo texto bruto da exceção incluído no prompt de recuperação.
- Um aviso amigável pode informar que o modo seguro foi usado, sem mostrar detalhes do backend no conteúdo.
- A correção não altera os modos de copy `exact` ou `preserved`.
