# Feature Specification: Persistência integral dos projetos

**Feature Branch**: `029-project-persistence`

**Created**: 2026-08-14

**Status**: Ready

**Input**: Corrigir o salvamento para que um carrossel permaneça exatamente como foi deixado após salvar, fechar e reabrir o aplicativo, sem regenerar textos ou imagens.

## User Scenarios & Testing

### User Story 1 - Reabrir exatamente o projeto salvo (Priority: P1)

Como usuário, quero salvar um projeto, fechar completamente o aplicativo e reabri-lo com todos os slides, textos, imagens e configurações exatamente no estado salvo.

**Why this priority**: Perder uma edição já concluída invalida o editor e pode destruir trabalho do usuário.

**Independent Test**: Criar um projeto com cinco slides e mídias, alterar propriedades em slides diferentes, salvar, encerrar todos os processos do aplicativo, reabrir o mesmo perfil e comparar a assinatura completa do projeto restaurado com a assinatura salva.

**Acceptance Scenarios**:

1. **Given** um projeto editado e salvo, **When** o aplicativo é fechado e aberto novamente, **Then** o projeto aparece no Dashboard e pode ser aberto com o mesmo conteúdo, ordem, imagens e configurações.
2. **Given** um projeto restaurado, **When** o editor é aberto, **Then** nenhuma geração automática de texto ou imagem é iniciada.
3. **Given** imagens locais, remotas ou em dados incorporados no projeto salvo, **When** o projeto é restaurado, **Then** as referências válidas continuam associadas aos mesmos slides.

---

### User Story 2 - Salvar de forma explícita e confiável (Priority: P1)

Como usuário, quero que o botão “Salvar projeto” confirme uma gravação real e durável, não apenas uma atualização temporária da tela.

**Why this priority**: O usuário precisa saber que pode fechar o programa sem perder o trabalho.

**Independent Test**: Clicar em salvar, aguardar a confirmação, encerrar imediatamente o aplicativo e verificar o projeto após a próxima abertura.

**Acceptance Scenarios**:

1. **Given** alterações ainda não persistidas, **When** o usuário clica em “Salvar projeto”, **Then** o estado completo é gravado antes da confirmação visual.
2. **Given** uma falha de armazenamento, **When** o usuário tenta salvar, **Then** o aplicativo informa a falha e não exibe uma confirmação falsa.

---

### User Story 3 - Fechar sem perder alterações recentes (Priority: P2)

Como usuário, quero que alterações já feitas no editor sejam consolidadas ao fechar o aplicativo, mesmo se eu não clicar novamente no botão de salvar após o último ajuste.

**Why this priority**: Fechar a janela é uma ação comum e não deve apagar o trabalho recente.

**Independent Test**: Salvar o projeto uma vez, fazer uma alteração adicional, fechar a janela imediatamente e verificar a alteração após reiniciar.

**Acceptance Scenarios**:

1. **Given** um projeto existente com alterações recentes, **When** a janela é fechada, **Then** o estado atual é persistido antes do encerramento.
2. **Given** uma gravação em andamento, **When** o fechamento é solicitado, **Then** o aplicativo aguarda a conclusão ou preserva a última versão íntegra.

### Edge Cases

- O aplicativo é fechado imediatamente após mover um slider ou editar um texto.
- O projeto contém uma imagem em processo, pausada, com erro ou já concluída.
- O armazenamento remoto está indisponível, mas o armazenamento local continua acessível.
- Existe um registro antigo incompleto ou parcialmente corrompido.
- O usuário salva mais de uma vez rapidamente.
- O aplicativo é aberto com um projeto salvo que anteriormente possuía jobs de geração concluídos.

## Requirements

### Functional Requirements

- **FR-001**: O sistema MUST persistir todos os slides, sua ordem e todas as propriedades editáveis do projeto.
- **FR-002**: O sistema MUST persistir as referências das mídias sem iniciar substituição ou regeneração na restauração.
- **FR-003**: O botão “Salvar projeto” MUST concluir a gravação durável antes de confirmar sucesso.
- **FR-004**: O sistema MUST persistir alterações pendentes antes do fechamento normal da janela.
- **FR-005**: O sistema MUST restaurar o projeto salvo no Dashboard e no editor após um reinício completo.
- **FR-006**: O sistema MUST distinguir jobs de geração realmente pendentes de jobs concluídos, pausados, cancelados ou antigos.
- **FR-007**: A restauração MUST NOT executar geração de texto, reauditoria, reescrita ou geração de imagem sem uma nova ação explícita do usuário.
- **FR-008**: O sistema MUST manter uma cópia local íntegra quando a sincronização remota não estiver disponível.
- **FR-009**: O sistema MUST tratar registros antigos ou incompletos com valores padrão sem descartar dados válidos.
- **FR-010**: O sistema MUST impedir gravações concorrentes de sobrescreverem uma versão mais recente com uma versão antiga.
- **FR-011**: Falhas de salvamento MUST ser apresentadas ao usuário sem confirmação falsa de sucesso.

### Key Entities

- **Projeto persistido**: identidade, nome, slides, slide ativo, formato, estrutura, tema, estado de edição, datas e versão do esquema.
- **Slide persistido**: conteúdo, mídia, tipografia, layout, efeitos, cantos, badge, CTA e estado definitivo do job de imagem.
- **Gravação pendente**: versão do projeto, motivo da gravação e promessa de conclusão usada para serializar operações concorrentes.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Em 10 ciclos consecutivos de salvar, fechar e reabrir, 100% dos projetos restauram uma assinatura idêntica à versão salva.
- **SC-002**: Nenhum ciclo de restauração inicia geração de texto ou imagem sem ação explícita do usuário.
- **SC-003**: A confirmação do botão de salvar somente aparece depois que a gravação pode ser lida novamente pelo aplicativo.
- **SC-004**: Alterações feitas até 100 ms antes do fechamento normal permanecem presentes após a reabertura.
- **SC-005**: Um projeto salvo aparece no Dashboard em até 2 segundos após a abertura do aplicativo.

## Assumptions

- O perfil e o diretório de dados usados antes e depois do reinício são os mesmos.
- O Supabase continua sendo uma camada de sincronização, mas a persistência local é o fallback obrigatório.
- Fechamentos forçados pelo sistema operacional sem tempo para executar código preservam pelo menos a última gravação concluída.
- Jobs antigos não são retomados automaticamente; o usuário pode solicitar nova geração manualmente.
