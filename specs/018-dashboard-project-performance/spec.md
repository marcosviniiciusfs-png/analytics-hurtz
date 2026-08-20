# Feature Specification: Projetos instantâneos e exclusão confiável

**Feature Branch**: `018-dashboard-project-performance`  
**Created**: 2026-08-13  
**Status**: Approved

## User Scenarios & Testing

### User Story 1 - Ver capas sem atraso (Priority: P1)

Ao abrir o dashboard, o usuário vê imediatamente a última prévia disponível de cada projeto, sem esperar a assinatura ou o carregamento das imagens de todos os slides no Supabase.

**Independent Test**: armazenar um projeto com uma prévia leve e uma imagem original grande; renderizar o dashboard e confirmar que a prévia leve já está aplicada no primeiro ciclo de renderização.

### User Story 2 - Excluir um projeto de forma confiável (Priority: P1)

Depois de confirmar a exclusão, o projeto desaparece imediatamente do dashboard, permanece removido após atualizar a tela e é apagado do Supabase em segundo plano. Cliques repetidos não disparam exclusões concorrentes.

**Independent Test**: excluir um projeto conectado, atualizar o dashboard durante a chamada remota e confirmar que ele não reaparece; repetir com falha de rede e confirmar que o tombstone local impede a restauração.

## Edge Cases

- Projeto antigo sem prévia leve usa a imagem atual ou um fundo coerente e gera a prévia em segundo plano.
- URL assinada expirada não bloqueia os cards nem remove a prévia local.
- Falha de rede durante a exclusão mantém o projeto oculto e agenda nova tentativa.
- Projeto sem ID continua podendo ser removido localmente por sua chave legada.
- Atualização remota não substitui manipuladores dos botões por índice visual.

## Requirements

- **FR-001**: O dashboard MUST renderizar dados locais antes de qualquer chamada de rede.
- **FR-002**: Cada projeto MUST poder armazenar uma `dashboardCover` leve e independente da imagem original.
- **FR-003**: A prévia leve MUST ser criada fora do caminho crítico e persistida localmente para próximas aberturas.
- **FR-004**: A sincronização MUST renderizar metadados remotos antes de hidratar todas as imagens dos slides.
- **FR-005**: Imagens remotas MUST ser hidratadas em segundo plano sem apagar capas locais válidas.
- **FR-006**: A exclusão MUST possuir um único manipulador por projeto e localizar o projeto por ID estável.
- **FR-007**: Após confirmação, a remoção local MUST ser otimista e imediata.
- **FR-008**: Projetos com exclusão remota pendente MUST ser registrados em tombstones e filtrados em toda sincronização.
- **FR-009**: A exclusão remota bem-sucedida MUST remover o tombstone; uma falha MUST preservá-lo para nova tentativa.
- **FR-010**: O botão MUST impedir clique duplo e informar estado ocupado de forma acessível.
- **FR-011**: Atualização do dashboard e reinicialização MUST NOT restaurar um projeto tombstonado.

## Success Criteria

- **SC-001**: A capa local aparece no mesmo ciclo de renderização do card, sem aguardar rede.
- **SC-002**: O card desaparece em até 100 ms após a confirmação de exclusão.
- **SC-003**: Cem por cento dos testes de clique duplo realizam no máximo uma exclusão.
- **SC-004**: Falhas remotas não fazem o projeto reaparecer no dashboard.
- **SC-005**: A suíte existente de layout, projetos e sincronização permanece aprovada.

