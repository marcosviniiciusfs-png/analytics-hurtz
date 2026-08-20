# Feature Specification: Fluxo gratuito assistido do Ideogram

**Feature Branch**: `016-ideogram-free-assisted`

**Created**: 2026-08-13

**Status**: Approved

**Input**: Usar o segundo fluxo gratuito: preparar o prompt por slide, abrir o Ideogram online, acompanhar o download oficial e importar automaticamente a imagem no slide correto.

## User Scenarios & Testing

### User Story 1 - Gerar uma imagem no Ideogram gratuito (Priority: P1)

Ao solicitar uma imagem, o usuário recebe um prompt específico para o slide, abre o Ideogram oficial, gera e baixa a imagem; ao retornar ao app, o arquivo é aplicado automaticamente ao mesmo slide.

**Why this priority**: Este é o caminho viável para usar a interface gratuita sem exigir API paga nem executar um modelo incompatível com a GPU local.

**Independent Test**: Iniciar o fluxo em um slide, baixar uma imagem nova na pasta de downloads e confirmar que somente esse slide recebe a imagem.

**Acceptance Scenarios**:

1. **Given** um slide selecionado, **When** o usuário inicia o fluxo, **Then** o app exibe o prompt completo, permite editá-lo, copiá-lo e abrir o site oficial.
2. **Given** uma sessão aguardando o download, **When** um arquivo de imagem válido termina de baixar, **Then** ele é aplicado automaticamente ao slide que iniciou a sessão.
3. **Given** que o usuário deseja interromper, **When** cancela a espera, **Then** nenhum download posterior altera o slide.
4. **Given** que o usuário nunca utilizou o Ideogram, **When** abre o fluxo, **Then** encontra instruções numeradas em português e um botão direto para o gerador oficial.

---

### User Story 2 - Preencher uma fila de slides com segurança (Priority: P1)

Quando um carrossel foi configurado para ter imagens, o usuário percorre uma fila clara dos slides pendentes, sem geração local automática e sem perder o trabalho já importado.

**Why this priority**: Um carrossel pode ter até dez imagens; o fluxo precisa continuar simples e associar cada download ao lugar certo.

**Independent Test**: Concluir dois itens de uma fila de três slides e verificar avanço, contagem, procedência e retomada do item restante.

**Acceptance Scenarios**:

1. **Given** slides elegíveis sem imagem, **When** o editor abre, **Then** a fila informa quantos estão pendentes e aguarda uma ação do usuário.
2. **Given** uma imagem importada com sucesso, **When** a importação termina, **Then** a fila marca o slide como concluído e oferece o próximo.
3. **Given** que imagens não foram solicitadas, **When** o carrossel é criado, **Then** nenhuma fila ou geração é iniciada.

---

### User Story 3 - Recuperar falhas sem bloquear a edição (Priority: P2)

O usuário pode escolher o arquivo manualmente, tentar novamente ou continuar editando quando o download não é detectado.

**Why this priority**: Navegadores podem salvar em pastas diferentes ou renomear arquivos, e isso não deve bloquear o projeto.

**Independent Test**: Simular download em outra pasta, usar a seleção manual e confirmar que o slide recebe a imagem e o editor permanece responsivo.

**Acceptance Scenarios**:

1. **Given** que nenhum arquivo é detectado, **When** o usuário escolhe uma imagem manualmente, **Then** ela é aplicada ao slide alvo da sessão.
2. **Given** um arquivo parcial ou formato não suportado, **When** ele aparece em Downloads, **Then** o app o ignora e continua aguardando.
3. **Given** um erro de leitura, **When** ele ocorre, **Then** o app mostra uma mensagem acionável e mantém as opções de tentar novamente, cancelar e selecionar manualmente.

### Edge Cases

- Dois arquivos são baixados em sequência: somente o primeiro arquivo válido posterior ao início da sessão é importado.
- O download ainda está sendo gravado: a importação aguarda o tamanho do arquivo estabilizar.
- O usuário muda de slide durante a espera: a imagem continua vinculada ao slide que iniciou a sessão.
- O slide é apagado durante a espera: a sessão é cancelada e o arquivo não é aplicado em outro slide.
- O navegador usa outra pasta: a seleção manual permanece disponível.
- Um arquivo anterior é modificado: apenas arquivos novos ou efetivamente atualizados após o início da sessão são candidatos.
- O app é fechado: o monitor é encerrado sem processo órfão.

## Requirements

### Functional Requirements

- **FR-001**: O sistema MUST preparar um prompt individual que represente a copy e a direção visual do slide selecionado.
- **FR-002**: O prompt MUST proibir texto, marcas, interfaces, colagens e elementos não solicitados dentro da imagem.
- **FR-003**: O usuário MUST poder revisar e editar o prompt antes de abrir o Ideogram.
- **FR-004**: O sistema MUST copiar o prompt e abrir o endereço oficial do Ideogram somente após uma ação explícita.
- **FR-005**: O sistema MUST monitorar apenas novos arquivos de imagem concluídos após o início da sessão.
- **FR-006**: O sistema MUST vincular cada sessão a um identificador estável de slide, não apenas à posição atual na lista.
- **FR-007**: O sistema MUST importar automaticamente o primeiro download válido da sessão para o slide vinculado.
- **FR-008**: O sistema MUST identificar a procedência importada como `Ideogram 4 · web gratuito`.
- **FR-009**: O usuário MUST poder cancelar, tentar novamente e selecionar um arquivo manualmente.
- **FR-010**: O sistema MUST encerrar o monitor imediatamente após sucesso, cancelamento, exclusão do slide ou fechamento do app.
- **FR-011**: Quando imagens foram solicitadas, o sistema MUST exibir uma fila dos slides pendentes e avançar após cada importação.
- **FR-012**: Quando imagens não foram solicitadas, o sistema MUST permanecer totalmente inativo.
- **FR-013**: O fluxo gratuito MUST NOT iniciar Ideogram local, FLUX local, Gemini ou qualquer geração pesada em segundo plano.
- **FR-014**: A edição do carrossel MUST permanecer disponível durante toda a espera.
- **FR-015**: A interface MUST mostrar claramente os estados preparando, aguardando download, importando, concluído, cancelado e falhou.
- **FR-016**: O sistema MUST limitar arquivos aceitos a imagens compatíveis e de tamanho seguro.
- **FR-017**: O modal MUST apresentar o procedimento completo em português, em passos numerados e na ordem exata das ações.
- **FR-018**: O prompt visível e copiável MUST estar integralmente em português, incluindo as proibições de texto e colagem.
- **FR-019**: O sistema MUST abrir diretamente o painel oficial de criação em `https://ideogram.ai/__/`.
- **FR-020**: O prompt MUST permanecer recolhido por padrão para priorizar as instruções, mas continuar editável antes da cópia.
- **FR-021**: O modal MUST manter cabeçalho, conteúdo, status e ações legíveis sem sobreposição em telas de notebook.

### Key Entities

- **Sessão de importação**: identificador, slide alvo, horário de início, prompt, estado e arquivo candidato.
- **Item da fila**: slide, estado, prompt e procedência da imagem.
- **Imagem importada**: dados da imagem, nome, tipo, origem e horário de importação.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Um download válido é refletido no slide correto em até 3 segundos após terminar de gravar.
- **SC-002**: 100% dos testes com troca de slide mantêm a imagem vinculada ao slide de origem.
- **SC-003**: Arquivos parciais, não suportados e anteriores à sessão nunca são importados.
- **SC-004**: Cancelar uma sessão impede qualquer alteração posterior no slide em 100% dos testes.
- **SC-005**: O usuário consegue concluir uma imagem em no máximo três ações no app: iniciar, copiar/abrir e baixar no site.
- **SC-006**: O editor continua respondendo a navegação e edição durante toda a espera pelo download.
- **SC-007**: Nenhum processo de geração local é iniciado no fluxo gratuito.
- **SC-008**: Uma pessoa sem experiência prévia consegue identificar como gerar e baixar a imagem apenas lendo o modal, sem orientação externa.
- **SC-009**: O modal permanece utilizável sem texto cortado ou ações sobrepostas a partir de 720 px de largura e 600 px de altura.

## Assumptions

- O usuário já possui acesso ao site do Ideogram e fará login quando necessário.
- A geração e o download no site permanecem ações do usuário; o app não automatiza cliques nem contorna limites do serviço.
- A pasta padrão de Downloads do sistema é o destino principal; seleção manual cobre navegadores configurados de outra forma.
- O fluxo mantém a geração local instalada apenas como legado desativado, sem removê-la do computador.
