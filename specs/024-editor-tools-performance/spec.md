# Feature Specification: Ferramentas do editor sem travamentos

## User Scenarios & Testing

### User Story 1 - Editar um card com resposta imediata (Priority: P1)

Como usuário do editor, quero ajustar fundo, overlay, tipografia, posição, imagem e cantos sem congelar o painel, o scroll ou os outros cards.

**Independent Test**: abrir um projeto com cinco slides, operar cada controle pelo Playwright e confirmar visualmente e por métricas que apenas o card ativo é atualizado.

**Acceptance Scenarios**:

1. **Given** cinco cards visíveis, **When** o usuário arrasta qualquer seletor do card ativo, **Then** o controle acompanha o ponteiro, o preview ativo muda e os outros quatro cards permanecem estáveis.
2. **Given** uma seção aberta no painel lateral, **When** o usuário alterna cores, padrões, overlay, tipografia, posições, imagem e cantos, **Then** não ocorre erro JavaScript, bloqueio de scroll nem reconstrução integral do editor.
3. **Given** uma edição concluída, **When** o usuário seleciona outro card e retorna, **Then** o valor editado continua aplicado sem quebrar layout ou qualidade do card.

### User Story 2 - Navegar durante a edição (Priority: P2)

Como usuário, quero continuar rolando o painel e alternando cards enquanto edito, sem engasgos perceptíveis.

**Independent Test**: executar ciclos de scroll, seleção e edição em sequência e medir a latência da interface.

**Acceptance Scenarios**:

1. **Given** o editor carregado, **When** ocorrem 100 atualizações consecutivas de controles, **Then** o scroll continua respondendo e nenhuma tarefa longa bloqueia a interface.
2. **Given** cards inativos congelados, **When** o card ativo muda, **Then** somente a transição necessária consolida o snapshot anterior.

### Edge Cases

- Seletores de cor abertos devem fechar ao clicar fora sem capturar o scroll.
- Um controle ausente para determinado layout deve ser ignorado sem interromper os demais testes.
- Cards sem imagem devem aceitar fundo e overlay sem erro.
- Edições em carrossel infinito não podem mover ou recortar cards vizinhos indevidamente.

## Requirements

### Functional Requirements

- **FR-001**: Todas as ferramentas visíveis no menu lateral MUST responder individualmente sem reconstruir todos os cards.
- **FR-002**: Fundo do slide e Sombra/Overlay MUST atualizar somente as camadas afetadas do card ativo.
- **FR-003**: Tipografia, título, texto, posição, imagem no contêiner, grade, efeitos, badge, CTA e cantos MUST permanecer operáveis após troca de card.
- **FR-004**: Cards inativos MUST manter DOM e conteúdo visual estáveis durante edições contínuas.
- **FR-005**: O painel lateral e a faixa de cards MUST continuar roláveis durante e após arrastes.
- **FR-006**: A aplicação MUST permanecer sem erros de página, console ou processos durante o cenário automatizado.
- **FR-007**: A suíte Playwright MUST cobrir inputs, selects, switches, botões, seletores de cor, scroll e troca de cards.
- **FR-008**: A exportação e a resolução final dos cards MUST permanecer inalteradas.

## Success Criteria

- **SC-001**: Pelo menos 95% das atualizações de controles terminam em até 50 ms e nenhuma ultrapassa 150 ms no computador de teste.
- **SC-002**: Cem atualizações contínuas não provocam repaint de card inativo.
- **SC-003**: Scroll, seleção e abertura de seções respondem em até 100 ms após uma sequência de edição.
- **SC-004**: O teste completo percorre todas as famílias de ferramentas sem erro JavaScript.
- **SC-005**: Os quatro cards inativos de um projeto de cinco slides preservam sua assinatura visual durante a edição do card selecionado.

## Assumptions

- “Todas as ferramentas” abrange controles atualmente renderizados pelo editor; recursos dependentes de credenciais externas são testados até o ponto anterior à chamada externa.
- A otimização preserva o design e os recursos existentes; o objetivo é remover trabalho redundante, não simplificar a ferramenta.

