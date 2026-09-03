# Feature Specification: Humanizer como validação final da copy

**Feature Branch**: `030-humanizer-final-gate`

**Created**: 2026-08-14

**Status**: Ready

**Input**: Garantir que a copy gerada não mantenha sinais claros de escrita por IA, sem alterar textos que o usuário determinou que fossem preservados literalmente.

## User Scenarios & Testing

### User Story 1 - Receber uma copy natural no carrossel (Priority: P1)

Como usuário, quero que a copy passe por uma revisão final real para que frases artificiais, travessões retóricos, enumerações forçadas e clichês não cheguem aos slides.

**Why this priority**: Uma copy com aparência de IA reduz a credibilidade do conteúdo e contraria a proposta central da ferramenta.

**Independent Test**: Gerar um carrossel a partir de um rascunho que contenha `Seu corpo não estragou. Ele mudou — hormônio, circulação, ritmo de vida.` e verificar que a versão final não contém travessão, não mantém a enumeração telegráfica e preserva a ideia original.

**Acceptance Scenarios**:

1. **Given** uma copy gerada com sinais reconhecíveis de escrita artificial, **When** todas as auditorias do carrossel terminam, **Then** a copy é revisada e validada antes de ser exibida.
2. **Given** uma primeira revisão que ainda mantém um padrão bloqueante, **When** a validação final detecta o problema, **Then** o sistema tenta uma correção dirigida e verifica novamente o resultado.
3. **Given** indisponibilidade ou resposta inválida do modelo local, **When** a copy chega à etapa final, **Then** o sistema aplica uma limpeza segura e entrega o carrossel sem travessões retóricos ou expressões proibidas.

---

### User Story 2 - Preservar copy fechada pelo usuário (Priority: P1)

Como usuário, quero que uma copy marcada para ser mantida exatamente continue idêntica, mesmo quando contém escolhas de estilo que o Humanizer normalmente removeria.

**Why this priority**: A instrução explícita do usuário tem prioridade sobre preferências editoriais automáticas.

**Independent Test**: Informar slides estruturados com a instrução “manter exatamente”, incluindo um travessão, gerar o carrossel e comparar os textos de origem e destino byte a byte.

**Acceptance Scenarios**:

1. **Given** uma copy em modo exato ou preservado, **When** o carrossel é gerado, **Then** o Humanizer não reescreve título, corpo, legenda ou CTA.
2. **Given** uma copy gerada normalmente, **When** a revisão ocorre, **Then** assunto, fatos, dor, desejo, promessa e CTA permanecem presentes.

### Edge Cases

- A resposta do modelo é JSON inválido.
- O modelo devolve exatamente o mesmo texto recebido.
- A auditoria de estrutura reescreve a copy depois da primeira humanização.
- Uma enumeração de três itens é factual e necessária, não apenas um recurso retórico.
- O texto contém hífen ortográfico legítimo, como “guarda-chuva”, que não deve ser removido.
- O texto é curto, natural e já cabe no card.

## Requirements

### Functional Requirements

- **FR-001**: O sistema MUST executar a validação Humanizer depois de qualquer auditoria ou reparo que possa alterar a copy.
- **FR-002**: A validação MUST analisar separadamente títulos, corpos, legenda e CTA gerados.
- **FR-003**: O sistema MUST detectar travessões retóricos, expressões proibidas, paralelismos artificiais e enumerações telegráficas que produzam aparência de escrita por IA.
- **FR-004**: Quando houver problemas, o sistema MUST solicitar uma revisão dirigida que preserve assunto, fatos, intenção, dor, desejo, promessa e CTA.
- **FR-005**: A resposta revisada MUST ser verificada; uma resposta idêntica ou ainda reprovada não pode ser tratada como humanizada.
- **FR-006**: Em caso de falha do modelo, o sistema MUST aplicar correções determinísticas apenas aos padrões que possam ser alterados sem inventar fatos.
- **FR-007**: O sistema MUST NOT alterar cópias em modo `exact` ou `preserved`.
- **FR-008**: O sistema MUST NOT reescrever textos curtos que já estejam aprovados pela validação.
- **FR-009**: Hífens ortográficos legítimos MUST ser preservados.
- **FR-010**: O resultado da validação MUST ficar disponível no estado do projeto para diagnóstico e testes.
- **FR-011**: A etapa final MUST impedir que uma correção estrutural posterior reintroduza os padrões já removidos.

### Key Entities

- **Relatório Humanizer**: aprovação, lista de problemas, campos afetados, tentativas e modo de correção.
- **Copy protegida**: conteúdo cujo modo exige preservação literal.
- **Copy gerada**: conteúdo que pode passar por revisão editorial sem perder o significado.

## Success Criteria

### Measurable Outcomes

- **SC-001**: O caso de regressão fornecido pelo usuário é detectado antes da exibição final em 100% das execuções de teste.
- **SC-002**: Nenhuma copy gerada aprovada contém travessão ou meia-risca usados como atalho retórico.
- **SC-003**: Cópias protegidas permanecem idênticas em 100% dos testes de preservação.
- **SC-004**: Quando o modelo ignora a solicitação de revisão, a falha é detectada e o fallback é aplicado em uma única geração, sem bloquear o carrossel.
- **SC-005**: Textos naturais e já aprovados não sofrem alteração em 100% dos casos de controle.

## Assumptions

- Enumerações factuais não são automaticamente proibidas; somente padrões retóricos artificiais devem ser sinalizados.
- A limpeza determinística é conservadora e não cria fatos, números ou promessas.
- O modelo local permanece disponível como revisor preferencial, mas não é considerado prova de que a copy foi humanizada.
