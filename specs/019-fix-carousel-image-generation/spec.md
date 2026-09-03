# Feature Specification: Correção da geração de imagens do carrossel

**Feature Branch**: `019-fix-carousel-image-generation`  
**Created**: 2026-08-13  
**Status**: In progress  
**Input**: Corrigir o erro que pausa a geração das cinco imagens e validar a criação completa de um carrossel com imagens.

## User Scenarios & Testing

### User Story 1 - Gerar todas as imagens do carrossel (Priority: P1)

Ao solicitar imagens na configuração inicial, o usuário recebe uma imagem correspondente para cada slide elegível sem a fila parar por erro interno.

**Independent Test**: Criar um carrossel de cinco slides com imagens, aguardar o fim da fila e confirmar cinco imagens aplicadas e zero pendências.

**Acceptance Scenarios**:

1. **Given** um carrossel de cinco slides sem imagens, **When** a geração é iniciada, **Then** cada auditoria recebe o slide exato que originou a imagem.
2. **Given** uma imagem aprovada, **When** a fila avança, **Then** a imagem é aplicada somente ao slide correspondente.
3. **Given** uma falha temporária, **When** o usuário clica em Tentar, **Then** apenas as imagens pendentes são processadas novamente.

### User Story 2 - Falhar de forma controlada (Priority: P1)

Uma indisponibilidade da auditoria não pode produzir exceção JavaScript nem apagar imagens já concluídas.

**Independent Test**: Indisponibilizar a auditoria semântica, executar a fila e confirmar ausência de acesso a propriedades de valor indefinido e manutenção do progresso concluído.

## Edge Cases

- O slide é apagado ou reordenado durante a geração.
- A auditoria semântica fica indisponível depois de a imagem ser criada.
- Uma nova tentativa é iniciada após parte dos slides já estar concluída.
- O botão de geração de um único slide usa o mesmo contrato da fila completa.

## Requirements

### Functional Requirements

- **FR-001**: Toda auditoria semântica MUST receber a instância exata do slide auditado.
- **FR-002**: O pipeline MUST impedir leitura de propriedades quando o slide estiver ausente e retornar uma falha controlada.
- **FR-003**: A fila MUST preservar imagens já concluídas ao tentar novamente.
- **FR-004**: O botão de imagem individual MUST obedecer ao mesmo contrato de auditoria da fila.
- **FR-005**: A correção MUST ser validada em um carrossel de cinco slides com geração efetiva de imagens.
- **FR-006**: Uma auditoria semântica indisponível MUST ser registrada para revisão sem derrubar toda a fila quando as verificações objetivas forem aprovadas.

## Success Criteria

- **SC-001**: Um carrossel de cinco slides termina com 5 de 5 imagens aplicadas ou apresenta uma causa externa específica por slide, sem exceção JavaScript.
- **SC-002**: Clicar em Tentar nunca reinicia slides já concluídos.
- **SC-003**: Nenhum fluxo de geração exibe `Cannot read properties of undefined`.
- **SC-004**: Os testes automatizados cobrem fila completa, nova tentativa, slide individual e referência correta do slide.

## Assumptions

- As credenciais Cloudflare já configuradas neste computador serão usadas no teste integrado real.
- Falhas legítimas do provedor continuam visíveis; apenas falhas internas e bloqueios por auditoria indisponível deixam de interromper a fila inteira.
