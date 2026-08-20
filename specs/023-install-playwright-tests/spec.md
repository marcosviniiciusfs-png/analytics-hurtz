# Feature Specification: Instalar Playwright para testes

## User Scenarios & Testing

### User Story 1 - Executar testes automatizados do app (Priority: P1)

Como responsável pelo Hurtz Flow Studio, quero executar testes com Playwright por um comando do projeto para validar o aplicativo antes das próximas entregas.

**Independent Test**: executar o comando documentado e confirmar que o aplicativo desktop abre, exibe o Dashboard e fecha sem deixar processo ativo.

**Acceptance Scenarios**:

1. **Given** o projeto com as dependências instaladas, **When** o teste Playwright é executado, **Then** o Hurtz Flow Studio abre em uma janela automatizada e o Dashboard fica visível.
2. **Given** um teste concluído ou interrompido por falha, **When** a execução termina, **Then** a janela automatizada é fechada.
3. **Given** uma falha futura, **When** o teste termina, **Then** evidências de diagnóstico podem ser mantidas sem serem versionadas no repositório.

### Edge Cases

- O teste deve usar uma única instância para evitar disputa com o aplicativo.
- A execução não deve depender de um servidor web separado.
- Artefatos temporários de teste não devem entrar no controle de versão.

## Requirements

### Functional Requirements

- **FR-001**: O projeto MUST disponibilizar um comando local único para executar a suíte Playwright.
- **FR-002**: A suíte MUST conseguir iniciar o aplicativo Electron do código-fonte.
- **FR-003**: O teste inicial MUST confirmar o título da janela, a visibilidade do Dashboard e os três caminhos de criação.
- **FR-004**: A suíte MUST fechar a aplicação mesmo quando uma asserção falhar.
- **FR-005**: O projeto MUST ignorar relatórios, resultados e rastros temporários produzidos pelos testes.
- **FR-006**: O navegador Chromium do Playwright MUST estar disponível para testes web futuros.

## Success Criteria

- **SC-001**: Um desenvolvedor executa toda a validação com um único comando.
- **SC-002**: O teste inicial conclui com sucesso em até 60 segundos neste computador.
- **SC-003**: Após o teste, não permanece uma janela de teste aberta.
- **SC-004**: Nenhum artefato temporário de teste aparece como arquivo versionável.

## Assumptions

- “Plugin Playwright” significa instalar o runner oficial Playwright Test no Hurtz Flow Studio.
- A suíte começa com Chromium e Electron; outros navegadores podem ser adicionados depois.

