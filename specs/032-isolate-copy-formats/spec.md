# Feature Specification: Isolamento de copy e formatos

**Feature Branch**: `[032-isolate-copy-formats]`

**Created**: 2026-08-16

**Status**: Ready

**Input**: Corrigir a reutilização de copy e contexto de gerações anteriores e garantir que cada formato de carrossel preserve sua estrutura individual, sem regressões nas funções existentes.

## User Scenarios & Testing

### User Story 1 - Gerar conteúdo sem contaminação anterior (Priority: P1)

Ao criar um novo carrossel, o usuário recebe uma copy baseada somente no prompt, referência, persona e opções da geração atual. Nenhuma frase, assunto ou contexto de um projeto anterior aparece no novo conteúdo.

**Why this priority**: A reutilização indevida muda o assunto pedido e torna o resultado inutilizável.

**Independent Test**: Gerar em sequência carrosséis sobre dois assuntos sem relação e confirmar que o segundo contém apenas conceitos do segundo pedido, inclusive quando a primeira geração foi salva, falhou ou usou recuperação.

**Acceptance Scenarios**:

1. **Given** um carrossel anterior sobre um assunto A, **When** o usuário gera um novo carrossel sobre um assunto B, **Then** todos os slides do novo carrossel se referem ao assunto B e não repetem frases ou conceitos exclusivos do assunto A.
2. **Given** uma resposta inválida do gerador durante o assunto B, **When** a recuperação automática é acionada, **Then** a recuperação usa o pedido B completo e nunca um rascunho, cache ou diagnóstico de outra geração.
3. **Given** dois pedidos textualmente diferentes, **When** ambos são gerados, **Then** nenhum resultado armazenado para um pedido pode ser devolvido para o outro.

---

### User Story 2 - Respeitar a identidade de cada formato (Priority: P1)

Ao escolher Minimalista, Profile, Creators, TechViral ou Infinito, o usuário recebe a família visual e a progressão de slides correspondentes ao formato selecionado.

**Why this priority**: Formatos indistinguíveis anulam a principal escolha criativa oferecida pelo produto.

**Independent Test**: Aplicar a mesma copy aos cinco formatos e comparar seus contratos visuais, progressão, tipografia, composição e metadados; cada formato deve produzir uma assinatura própria e estável.

**Acceptance Scenarios**:

1. **Given** um formato escolhido explicitamente, **When** o carrossel é construído ou reparado, **Then** nenhuma seleção antiga ou estado global substitui o formato atual.
2. **Given** a mesma copy e quantidade de slides, **When** ela é aplicada aos cinco formatos, **Then** cada formato mantém sua própria família de layouts, tipografia, cores e ritmo de progressão.
3. **Given** uma autocorreção de copy ou auditoria, **When** os slides são reconstruídos, **Then** a identidade estrutural do formato permanece igual à selecionada antes da correção.

---

### User Story 3 - Recuperar falhas sem entregar copy genérica (Priority: P2)

Se o gerador local falhar, o usuário ainda recebe um roteiro diretamente ligado ao pedido atual, sem frases de contingência genéricas que poderiam servir para qualquer tema.

**Why this priority**: A recuperação deve permitir continuar trabalhando, mas não pode esconder uma falha com conteúdo sem utilidade.

**Independent Test**: Simular resposta vazia, JSON inválido e conteúdo contaminado; o resultado de contingência deve preservar assunto, detalhes relevantes, progressão Hook–Corpo–CTA e formato atual.

**Acceptance Scenarios**:

1. **Given** uma falha total do gerador, **When** o modo seguro cria o roteiro, **Then** cada slide deriva de informações do pedido atual e o resultado não usa títulos fixos como “Comece pelo conceito” ou “Observe as consequências”.
2. **Given** um prompt curto, **When** o modo seguro é necessário, **Then** o assunto literal continua visível no Hook, no desenvolvimento e no CTA.
3. **Given** um prompt detalhado ou com blocos por slide, **When** a recuperação ocorre, **Then** os fatos, objeções, promessa e CTA fornecidos são preservados sem serem substituídos por abstrações.

### Edge Cases

- Um pedido idêntico pode ser repetido pelo usuário, mas deve iniciar uma nova execução isolada e não herdar o estado editado de um projeto anterior.
- Uma colisão de identificador de cache não pode retornar conteúdo de outro prompt.
- A troca de formato entre duas gerações consecutivas deve respeitar sempre a escolha mais recente.
- Prompts curtos, longos, com instruções visuais e com conteúdo explícito por slide devem manter o assunto atual.
- Copy marcada como “manter exatamente” continua protegida contra reescrita.
- Falhas de geração, humanização ou auditoria não podem transformar mensagens técnicas em conteúdo do carrossel.

## Requirements

### Functional Requirements

- **FR-001**: Cada geração MUST usar um contexto imutável criado a partir do prompt, referência, persona, formato, estrutura, composição e quantidade escolhidos naquele momento.
- **FR-002**: O sistema MUST impedir que respostas, rascunhos, diagnósticos ou estados de uma execução anterior sejam usados em uma nova execução com contexto diferente.
- **FR-003**: Qualquer reutilização de resultado armazenado MUST validar a correspondência integral com o pedido que originou o resultado; uma simples coincidência de identificador não é suficiente.
- **FR-004**: A geração principal, a humanização, a auditoria e a recuperação MUST receber a identidade da execução atual e o assunto atual completo.
- **FR-005**: O formato selecionado explicitamente MUST prevalecer sobre seleções anteriores, valores globais antigos e dados do projeto aberto anteriormente.
- **FR-006**: Minimalista, Profile, Creators, TechViral e Infinito MUST possuir contratos estruturais distintos e verificáveis.
- **FR-007**: A autocorreção e a recuperação MUST preservar o contrato estrutural do formato atual.
- **FR-008**: O modo seguro MUST criar texto específico a partir do pedido atual e MUST NOT usar títulos ou corpos genéricos fixos que omitam o assunto.
- **FR-009**: O resultado MUST manter a progressão Hook no primeiro slide, Corpo nos intermediários e CTA claro no último, sem apagar fatos, dor, desejo, promessa ou ação fornecidos.
- **FR-010**: Copy explícita marcada para preservação MUST continuar literal e não passar por humanização ou reescrita.
- **FR-011**: A correção MUST preservar edição, persistência, exportação, geração de imagens e demais ferramentas existentes.
- **FR-012**: O sistema MUST disponibilizar testes automatizados que reproduzam gerações sequenciais com assuntos diferentes, falhas de resposta e a matriz completa de formatos.

### Key Entities

- **Contexto de geração**: Snapshot da execução atual, incluindo identificador, pedido original, assunto interpretado, notas de conteúdo, persona, formato, estrutura, composição, referência e quantidade.
- **Resultado de copy**: Roteiro de slides ligado a um único contexto de geração e ao modo usado: gerado, recuperado ou preservado.
- **Contrato de formato**: Regras estáveis de layout, progressão, tipografia, paleta e metadados para cada família de carrossel.
- **Entrada armazenada**: Resultado reutilizável acompanhado do pedido integral e da versão do pipeline que o criou.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Em 20 pares de gerações sequenciais com assuntos distintos, 100% dos segundos resultados permanecem livres de frases e conceitos exclusivos do primeiro assunto.
- **SC-002**: Os cinco formatos produzem cinco assinaturas estruturais distintas em 100% das execuções da matriz automatizada.
- **SC-003**: Em falhas simuladas de resposta vazia, resposta inválida e contaminação técnica, 100% dos roteiros entregues mantêm pelo menos dois vínculos explícitos com o assunto atual e a sequência Hook–Corpo–CTA.
- **SC-004**: Todos os testes existentes de preservação literal, persistência, editor e exportação continuam aprovados.
- **SC-005**: O usuário consegue iniciar uma nova geração imediatamente após outra sem precisar limpar cache, reiniciar o aplicativo ou fechar o projeto anterior.

## Assumptions

- A geração local continua sem memória conversacional entre chamadas; o isolamento é responsabilidade do pipeline do aplicativo.
- Repetir exatamente o mesmo pedido é permitido, mas não autoriza reutilizar edições ou estado de outro projeto.
- As famílias de formato existentes serão preservadas e diferenciadas; este trabalho não redesenha o editor.
- A correção não altera a política atual de geração de imagens nem o armazenamento dos projetos.
