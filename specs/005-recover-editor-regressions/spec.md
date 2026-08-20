# Especificação: Recuperar o editor e separar posição de título e subtítulo

## Objetivo

Restaurar os contratos visuais e funcionais afetados pela última otimização, sem remover ferramentas já entregues. Simplificar “Título e subtítulo” com controles independentes de posição.

## Cenários do usuário

### US1 - Editar título e subtítulo separadamente

Ao mover o título em X ou Y, o subtítulo permanece no lugar. Ao mover o subtítulo, o título permanece no lugar.

### US2 - Continuar usando o editor completo

O usuário encontra tipografia, imagem, overlay, fundo, cantos, identidade e assistente, sem retorno ao editor antigo.

### US3 - Criar sem regressão visual

O formato escolhido produz slides legíveis e não herda configurações incompatíveis de outro formato.

## Requisitos funcionais

- **FR-001** Remover a grade “Layout e posição”.
- **FR-002** Exibir barras “Posição X” e “Posição Y” independentes para o título.
- **FR-003** Exibir barras “Posição X” e “Posição Y” independentes para o subtítulo.
- **FR-004** Atualizar a pré-visualização durante o arraste e persistir ao finalizar.
- **FR-005** Manter o alinhamento como controle independente.
- **FR-006** Preservar todas as ferramentas profissionais existentes.
- **FR-007** Evitar vazamento do último formato selecionado.
- **FR-008** Manter upload, remoção e edição manual de imagem disponíveis.
- **FR-009** Garantir contraste dos textos de canto em layouts claros e escuros.
- **FR-010** Ocultar o card genérico de posição substituído pelos controles específicos.
- **FR-011** Nunca iniciar geração de imagens junto da geração do carrossel.
- **FR-012** Manter “Gerar imagem deste slide” como ação manual individual.
- **FR-013** Isolar estrutura, hover, foco e clique das ações de imagem.

## Casos extremos

- Projetos antigos preservam suas posições.
- Trocar de slide sincroniza os quatro controles sem alterar conteúdo.
- Arrastar rapidamente não recria o carrossel nem causa piscadas.
- Slides claros não recebem textos de canto brancos invisíveis.
- Interagir com uma ação de imagem não altera o estado visual de outra.

## Critérios de sucesso

- **SC-001** Cada controle altera somente sua camada e eixo em todos os testes.
- **SC-002** Nenhuma ferramenta existente desaparece na auditoria estrutural.
- **SC-003** O arraste atualiza a tela imediatamente e só persiste ao final.
- **SC-004** Dashboard, assistente e editor abrem sem erro de JavaScript.
- **SC-005** A geração do carrossel não cria fila de imagens e a ação manual continua acessível.

## Premissas

- “Subtítulo” é o texto de apoio do slide.
- O alinhamento existente será preservado.
- A geração automática de imagens fica fora do fluxo principal; ferramentas manuais continuam acessíveis.
## Phase 5 — Sistema de cores e destaques

- **FR-014**: A cor de destaque deve ser aplicada, no canvas e na exportação, somente às palavras selecionadas no respectivo campo.
- **FR-015**: A seleção de palavras deve separar claramente palavras do título e palavras do texto, mantendo estados independentes.
- **FR-016**: A cor configurada para os textos dos cantos deve ser respeitada por todos os cantos habilitados.
- **FR-017**: Todos os seletores de cor devem usar uma interação consistente, sincronizar amostra e hexadecimal, permitir fechar ao clicar fora ou pressionar Escape e manter apenas um seletor aberto.
- **FR-018**: Alterações de cor devem atualizar a pré-visualização imediatamente e persistir sem afetar controles não relacionados.
## Phase 6 — Geração de imagem estritamente manual

- **FR-019**: Imagens só podem ser geradas após uma ação explícita no botão "Gerar imagem deste slide".
- **FR-020**: Abrir um projeto, renderizar, trocar de aba, recuperar foco, remover fundo ou mover uma imagem nunca pode iniciar ou retomar geração.
- **FR-021**: Filas automáticas e tentativas agendadas de versões anteriores devem ser canceladas e não podem inserir resultados no projeto atual.
- **FR-022**: Estados e avisos antigos de geração pendente devem ser normalizados para o modo manual sem remover imagens existentes.
## Phase 7 — Destaque por ocorrência

- **FR-023**: Cada palavra deve aparecer na ordem original do título ou do texto, inclusive quando houver repetições.
- **FR-024**: A seleção deve identificar a ocorrência pela posição, não pelo valor textual normalizado.
- **FR-025**: Selecionar uma ocorrência não pode destacar outra palavra idêntica anterior ou posterior.
- **FR-026**: Letras com e sem acento devem permanecer ocorrências independentes, sem equivalência automática.
- **FR-027**: Projetos com destaques antigos devem continuar abrindo sem erro e aceitar o novo modelo ao serem editados.
