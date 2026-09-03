# Feature Specification: Corrigir geração Creators

**Feature Branch**: `001-fix-creators-generation`

**Created**: 2026-08-11

**Status**: Ready

**Input**: Corrigir o formato Creators para que os slides tenham estruturas visuais distintas conforme seu papel narrativo e para que todas as imagens necessárias sejam geradas e exibidas automaticamente.

## User Scenarios & Testing

### User Story 1 - Carrossel Creators com ritmo visual (Priority: P1)

Como criador, quero que Hook, desenvolvimento e CTA tenham composições claramente diferentes, mantendo uma identidade visual coesa, para que o carrossel não pareça uma sequência de capas repetidas.

**Why this priority**: A repetição visual torna o formato Creators indistinguível dos demais e reduz a legibilidade narrativa.

**Independent Test**: Gerar um Creators de cinco slides e confirmar papéis narrativos válidos e ao menos três assinaturas de composição distintas.

**Acceptance Scenarios**:

1. **Given** o formato Creators e estrutura automática, **When** um carrossel de cinco slides é gerado, **Then** o primeiro slide é Hook, o último é CTA e os slides intermediários usam composições de desenvolvimento distintas.
2. **Given** um mesmo tema visual, **When** os slides são exibidos juntos, **Then** eles preservam cores e identidade, sem que todos tenham a mesma hierarquia ou posicionamento de capa.

---

### User Story 2 - Imagens geradas automaticamente (Priority: P1)

Como criador, quero que cada slide Creators que requer imagem receba sua própria imagem contextual, para não terminar a geração com cartões vazios ou eternamente pendentes.

**Why this priority**: Um carrossel com mídia pendente não está pronto para uso.

**Independent Test**: Gerar cinco slides com imagens habilitadas usando um provedor simulado e confirmar que cada slide elegível conclui, exibe ou registra uma falha recuperável com nova tentativa automática.

**Acceptance Scenarios**:

1. **Given** imagens habilitadas, **When** a copy termina, **Then** a geração de mídia inicia automaticamente para todos os slides elegíveis e informa progresso real.
2. **Given** uma falha transitória, **When** uma tentativa falha, **Then** o sistema tenta novamente sem deixar o job permanentemente pendente.
3. **Given** uma falha definitiva, **When** as tentativas se esgotam, **Then** o usuário vê qual slide falhou e pode tentar novamente, sem perder as imagens já concluídas.

---

### User Story 3 - Coerência entre copy e imagem (Priority: P2)

Como criador, quero que cada imagem represente especificamente o texto de seu próprio card, sem texto incorporado na imagem, para manter coerência e editabilidade.

**Why this priority**: Imagens genéricas ou desconectadas prejudicam a qualidade do anúncio.

**Independent Test**: Inspecionar os briefings enviados ao gerador e confirmar que são derivados de título, corpo e papel do slide, com proibição explícita de texto visual.

**Acceptance Scenarios**:

1. **Given** slides com mensagens diferentes, **When** seus briefings visuais são criados, **Then** cada briefing contém a lógica completa da copy daquele slide e difere semanticamente dos demais.
2. **Given** qualquer slide Creators, **When** a imagem é solicitada, **Then** o pedido proíbe letras, legendas, marcas e tipografia dentro da imagem.

### Edge Cases

- O provedor principal está indisponível e o gerador local precisa assumir a tentativa.
- Um slide não exige mídia pela composição escolhida e não deve ser contado como pendente.
- O usuário fecha ou troca de projeto durante a geração; resultados não podem ser aplicados ao projeto errado.
- Uma resposta de imagem vazia ou inválida deve ser tratada como falha, não como conclusão.
- Carrosséis com 3 ou 10 slides devem manter Hook e CTA únicos e variar o corpo conforme a quantidade disponível.

## Requirements

### Functional Requirements

- **FR-001**: O sistema MUST atribuir a cada slide um papel narrativo explícito: Hook, Corpo ou CTA.
- **FR-002**: O formato Creators MUST produzir ao menos três assinaturas de composição distintas em carrosséis de cinco ou mais slides.
- **FR-003**: Somente o primeiro slide MUST usar composição de capa/Hook e somente o último MUST usar composição de CTA.
- **FR-004**: Slides de Corpo MUST alternar hierarquia, tipografia e uso/posição de mídia de modo coerente e determinístico.
- **FR-005**: O sistema MUST iniciar automaticamente a geração de todas as imagens requeridas após a copy ser aprovada.
- **FR-006**: O contador de pendências MUST considerar apenas slides que realmente requerem imagem e ainda não possuem resultado válido.
- **FR-007**: Cada job MUST transicionar entre pendente, gerando, concluído ou falhou, sem permanecer indefinidamente em estado intermediário.
- **FR-008**: Falhas transitórias MUST receber novas tentativas limitadas e preservar resultados concluídos.
- **FR-009**: O usuário MUST poder tentar novamente apenas os slides com falha.
- **FR-010**: Cada pedido de imagem MUST ser derivado do título, corpo, papel narrativo e direção visual do slide correspondente.
- **FR-011**: Todo pedido de imagem MUST proibir texto, letras, logotipos, marcas d'água e elementos tipográficos incorporados.
- **FR-012**: Resultados assíncronos MUST ser aplicados apenas ao projeto e slide que originaram o job.
- **FR-013**: A correção MUST incluir testes automatizados de variedade estrutural e de conclusão do pipeline de imagens.

### Key Entities

- **Slide Creators**: Card com papel narrativo, conteúdo, assinatura de composição e requisito de mídia.
- **Assinatura de composição**: Combinação estável de layout, hierarquia tipográfica e estratégia de mídia.
- **Job de imagem**: Trabalho assíncrono ligado a projeto e slide, com estado, tentativas, progresso, briefing e resultado.

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100% dos carrosséis Creators de cinco slides possuem exatamente um Hook, três slides de Corpo e um CTA.
- **SC-002**: 100% dos carrosséis Creators de cinco ou mais slides apresentam pelo menos três assinaturas visuais distintas.
- **SC-003**: Em testes controlados, 100% dos jobs com resposta válida chegam ao estado concluído e aparecem no slide correto.
- **SC-004**: Nenhum job permanece pendente ou gerando após encerrar com sucesso ou esgotar as tentativas.
- **SC-005**: O progresso exibido corresponde ao total de slides que realmente requerem mídia e chega a 100% quando todos terminam.
- **SC-006**: 100% dos briefings de imagem testados são específicos ao card e contêm a restrição de não gerar texto.

## Assumptions

- O usuário escolheu uma composição que habilita imagens; “Sem imagens” continua sem criar jobs.
- A identidade visual Creators existente será preservada, mas sua composição será diversificada.
- O provedor principal e o fallback local existentes serão reutilizados.
- A geração continua em segundo plano e resultados concluídos são preservados durante novas tentativas.
