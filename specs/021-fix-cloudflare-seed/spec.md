# Feature Specification: Corrigir geração e isolar contexto visual do Cloudflare

**Created**: 2026-08-13  
**Status**: Complete

## User Scenarios & Testing

### User Story 1 - Gerar carrossel completo com imagens reais (Priority: P1)

Ao solicitar imagens, o usuário deve receber imagens visíveis em todos os cards sem que propriedades incompatíveis interrompam a fila.

**Acceptance Scenarios**:

1. **Given** um carrossel com cinco slides e imagens habilitadas, **When** a geração real termina, **Then** os cinco cards exibem imagens válidas.
2. **Given** que o modelo principal precisa de fallback, **When** o fallback é chamado, **Then** nenhuma propriedade não suportada é enviada.
3. **Given** que o teste real foi aprovado, **When** o usuário abre o dashboard, **Then** encontra um projeto de validação salvo cuja capa e slides contêm imagens visíveis.
4. **Given** cinco slides com direções visuais diferentes, **When** os prompts de imagem são preparados, **Then** cada prompt contém somente a direção exclusiva do seu slide e a direção global compartilhada.
5. **Given** uma interpretação visual armazenada de uma execução anterior, **When** a copy ou a direção exclusiva do slide muda, **Then** a interpretação é recalculada sem reutilizar o contexto antigo.

6. **Given** um carrossel em que uma imagem já foi concluída e quatro ficaram pendentes, **When** o usuário clica em “Tentar”, **Then** somente os quatro slides pendentes entram novamente na fila, todos recebem identificadores de destino distintos e a imagem concluída permanece inalterada.
7. **Given** uma falha transitória em uma tentativa de um slide, **When** a fila ainda possui tentativas ou outros slides, **Then** a falha fica isolada naquele slide e não interrompe o processamento dos demais.

## Requirements

- **FR-001**: Nenhuma chamada ao Cloudflare Workers AI MUST enviar a propriedade `seed`.
- **FR-002**: O contrato sem `seed` MUST valer para o modelo principal e para o fallback.
- **FR-003**: Uma falha remota MUST produzir mensagem acionável e não parecer processamento infinito.
- **FR-004**: A validação MUST executar o serviço real configurado, obter cinco imagens e confirmar que elas estão visíveis nos cards.
- **FR-005**: O carrossel aprovado MUST ser salvo como projeto de teste para visualização no dashboard do usuário.
- **FR-006**: A direção visual global MUST ser armazenada separadamente das direções exclusivas de cada slide.
- **FR-007**: O prompt enviado para um slide MUST NOT conter a direção visual exclusiva de qualquer outro slide.
- **FR-008**: A copy, a direção visual e a cena física de cada slide MUST formar um contexto isolado durante geração e auditoria.
- **FR-009**: A chave de reaproveitamento da interpretação visual MUST incluir a direção exclusiva do slide.
- **FR-010**: Orientações enumeradas por slide MUST ser associadas pelo número do slide mesmo quando coexistirem com uma direção visual global.

- **FR-011**: A auditoria semântica MUST aceitar relevância nas escalas `0–1` e `0–100`, normalizando a nota antes da decisão para que `1` não seja interpretado como `1/100`.
- **FR-012**: As auditorias independentes de OCR/estrutura e de contexto MUST executar em paralelo para reduzir o tempo por tentativa sem reduzir os critérios de qualidade.
- **FR-013**: Imagens aprovadas MUST ser persistidas como arquivos locais e referenciadas pelo projeto, evitando que imagens em base64 excedam a cota do `localStorage` e desapareçam após reiniciar.
- **FR-014**: A sincronização MUST distinguir caminhos de arquivos locais de caminhos do Supabase Storage e MUST NOT remover um projeto local recém-salvo antes de sua sincronização.
- **FR-015**: Cada slide MUST possuir um contrato visual próprio com copy, direção exclusiva e evidência obrigatória; uma imagem de etapa adjacente ou de outro slide MUST ser rejeitada.
- **FR-016**: As regras críticas de isolamento e proibição de texto MUST permanecer no prompt efetivamente enviado, mesmo quando o provedor limitar o prompt a 2048 caracteres.
- **FR-017**: A cena derivada da copy e a direção visual exclusiva MUST ser combinadas; a direção exclusiva MUST NOT substituir a semântica específica da copy.
- **FR-018**: A fila MUST guardar as quatro candidatas e, se nenhuma for aprovada integralmente, aplicar no card a candidata de maior pontuação, identificando-a como resultado de último recurso que precisa de revisão.

- **FR-019**: Antes de montar a fila, todos os slides MUST possuir identificadores únicos e estáveis; respostas MUST ser aplicadas somente ao identificador do slide que originou a solicitação.
- **FR-020**: O comando “Tentar” MUST reconstruir a fila apenas com slides elegíveis sem imagem, limpar a falha desses slides e preservar integralmente imagens já concluídas.
- **FR-021**: Uma falha de geração em uma tentativa MUST NOT encerrar a fila inteira; as tentativas restantes do slide e os demais slides MUST continuar.
- **FR-022**: Salvar ou sincronizar o projeto durante a geração MUST NOT invalidar a execução ativa nem deixar alvos sem status conclusivo.

## Success Criteria

- **SC-001**: Cinco de cinco slides terminam com imagem visível e status concluído.
- **SC-002**: Os testes de contrato comprovam ausência de `seed` em 100% das rotas Cloudflare.
- **SC-003**: O projeto de validação aparece em “Seus projetos recentes” ao reabrir o aplicativo.
- **SC-004**: Em um teste com cinco marcadores visuais exclusivos, 100% dos prompts contêm o marcador correto e 0% contêm marcadores dos outros slides.
- **SC-005**: Alterar apenas a direção de um slide invalida somente a interpretação visual desse slide.
- **SC-006**: Todos os prompts enviados têm no máximo 2048 caracteres, começam com identificação inequívoca do slide e terminam com o contrato sem texto.
- **SC-007**: A auditoria rejeita resultados cujo contexto pertença a outro slide ou cuja evidência obrigatória não esteja visível.
- **SC-008**: Após quatro tentativas concluídas, todo slide recebe a melhor imagem disponível e não permanece pendente apenas por reprovação da auditoria.

- **SC-009**: Em um teste com uma imagem pronta e quatro pendentes sem identificadores confiáveis, o primeiro clique em “Tentar” preserva a pronta e termina com cinco de cinco imagens visíveis.
- **SC-010**: Em um teste com falha transitória na primeira chamada, a fila continua e processa 100% dos slides elegíveis sem exigir recriar o carrossel.

## Assumptions

- As credenciais Cloudflare já configuradas pelo usuário permanecem disponíveis no armazenamento seguro do aplicativo.
- O teste real pode consumir a franquia gratuita correspondente às imagens geradas.
- Uma orientação sem marcadores de slide é considerada global; uma orientação com dois ou mais marcadores numerados é separada por slide.
