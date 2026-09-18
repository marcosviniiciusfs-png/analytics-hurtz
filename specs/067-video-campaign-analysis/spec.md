# Feature Specification: Análise de vídeo para campanha

**Feature Branch**: `067-video-campaign-analysis`

**Created**: 2026-09-18

**Status**: Ready for planning

**Input**: Substituir a descrição manual por vídeo obrigatório e sugerir a configuração da campanha a partir do conteúdo do criativo.

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.

  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Enviar o vídeo do anúncio (Priority: P1)

Como usuário, quero selecionar o vídeo que será anunciado em vez de digitar uma descrição, para iniciar a criação a partir do próprio criativo.

**Why this priority**: O vídeo é a fonte da campanha e substitui o campo de texto redundante.

**Independent Test**: O usuário seleciona um MP4 válido e vê nome, tamanho, prévia e ação para trocar o arquivo.

**Acceptance Scenarios**:

1. **Given** a criação de campanha aberta, **When** o usuário ainda não escolheu um vídeo, **Then** o avanço fica indisponível e a interface solicita o criativo.
2. **Given** um MP4 válido, **When** o usuário o seleciona, **Then** a interface apresenta o arquivo e inicia a análise.

---

### User Story 2 - Receber sugestões do criativo (Priority: P2)

Como usuário, quero receber sugestões de oferta, localização, faixa de público, destino e chamada para ação baseadas no áudio e conteúdo visual do vídeo, para começar a revisão com informações úteis.

**Why this priority**: Reduz trabalho manual sem fazer suposições finais em nome do usuário.

**Independent Test**: Um vídeo com referências a cidade e WhatsApp retorna sugestões correspondentes e identifica a origem de cada pista.

**Acceptance Scenarios**:

1. **Given** um vídeo analisável, **When** a análise termina, **Then** a revisão recebe um rascunho com as informações encontradas e campos ainda editáveis.
2. **Given** que o vídeo menciona contato por WhatsApp, **When** a análise termina, **Then** o destino sugerido é WhatsApp, sujeito à seleção manual de Página e número.

---

### User Story 3 - Manter controle humano (Priority: P3)

Como usuário, quero revisar e alterar qualquer sugestão antes de publicar, para que a IA nunca publique uma campanha sem minha confirmação.

**Why this priority**: O conteúdo do vídeo pode ser incompleto, ambíguo ou inadequado para segmentação automática.

**Independent Test**: Uma sugestão de local, público ou destino pode ser substituída no modal de revisão antes de publicar.

**Acceptance Scenarios**:

1. **Given** uma análise concluída, **When** o usuário abre a revisão, **Then** todos os valores sugeridos permanecem editáveis e nenhum anúncio é criado nessa etapa.

---

[Add more user stories as needed, each with an assigned priority]

### Edge Cases

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right edge cases.
-->

- A IA gratuita está indisponível ou excede limite: o vídeo continua selecionado e o usuário recebe opção de tentar novamente, sem cobrança e sem publicar.
- O vídeo não contém áudio ou texto: a análise retorna somente pistas confiáveis ou informa que não encontrou dados suficientes.
- O vídeo indica WhatsApp, mas não existe número elegível na Página: a revisão exige seleção válida antes de publicar.

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right functional requirements.
-->

### Functional Requirements

- **FR-001**: O sistema deve substituir a caixa de descrição inicial por uma área de seleção de vídeo MP4.
- **FR-002**: O sistema deve extrair pistas do áudio e de quadros representativos do vídeo, sem expor o vídeo ou a chave da IA ao navegador.
- **FR-003**: O sistema deve usar somente o roteador de modelos gratuitos configurado pelo administrador e nunca selecionar modelo pago como fallback.
- **FR-004**: O sistema deve retornar somente sugestões estruturadas e marcadas como sugestão para local, público, destino, oferta e chamada para ação.
- **FR-005**: O sistema deve permitir revisão e alteração manual de todas as sugestões antes da publicação.
- **FR-006**: Falha, indisponibilidade ou limite da IA não deve criar campanha nem impedir o usuário de tentar novamente.
- **FR-007**: A configuração final de Página, conta, WhatsApp, orçamento, criativo e publicação continua sujeita às validações existentes.
- **FR-008**: Para campanhas iniciadas por vídeo, o orçamento diário deve iniciar no mínimo aceito pelo produto e permanecer editável antes da publicação.
- **FR-009**: A revisão deve permitir alterar o nome da campanha, orçamento, Página, Instagram e destino; destinos de WhatsApp e formulário devem apresentar somente ativos autorizados e compatíveis com a Página escolhida.

*Example of marking unclear requirements:*

- **FR-006**: System MUST authenticate users via [NEEDS CLARIFICATION: auth method not specified - email/password, SSO, OAuth?]
- **FR-007**: System MUST retain user data for [NEEDS CLARIFICATION: retention period not specified]

### Key Entities *(include if feature involves data)*

- **Vídeo de campanha**: arquivo MP4 selecionado, sujeito aos limites e validações do produto.
- **Pista de vídeo**: texto ou fala extraído do criativo, com indicação de confiança.
- **Rascunho sugerido**: valores preliminares de campanha que o usuário poderá alterar antes de publicar.

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: O usuário consegue selecionar e trocar o vídeo em até duas ações.
- **SC-002**: Para vídeo com pista explícita de cidade ou WhatsApp, a sugestão correspondente é apresentada para revisão antes da publicação.
- **SC-003**: 100% das sugestões permanecem editáveis; 0% criam anúncios sem confirmação explícita.
- **SC-004**: Quando o serviço gratuito estiver indisponível, o usuário vê uma mensagem clara e pode tentar novamente sem incorrer em custo.

## Assumptions

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right assumptions based on reasonable defaults
  chosen when the feature description did not specify certain details.
-->

- O servidor tem capacidade para extrair representações compactas do vídeo antes da análise.
- A disponibilidade dos modelos gratuitos pode variar; ausência de capacidade será tratada como falha recuperável.
- A IA apenas sugere; não infere atributos pessoais sensíveis nem cria segmentação automática.
