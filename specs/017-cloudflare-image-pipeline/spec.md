# Feature Specification: Pipeline gratuito de imagens Cloudflare

**Feature Branch**: `017-cloudflare-image-pipeline`
**Created**: 2026-08-13
**Status**: Approved

## User Scenarios & Testing

### User Story 1 - Configurar a geração gratuita (Priority: P1)

O usuário informa o Account ID e o token do Workers AI uma única vez, com armazenamento seguro no computador, e consegue verificar se a integração está pronta sem expor a credencial na interface ou no projeto.

**Independent Test**: salvar uma configuração válida, reiniciar o aplicativo e confirmar que o estado permanece configurado sem retornar o token ao renderer.

### User Story 2 - Gerar imagens automaticamente (Priority: P1)

Quando o usuário pede imagens na criação do carrossel, cada slide elegível recebe uma imagem própria, gerada em segundo plano e acompanhada por progresso visível, sem bloquear o editor.

**Independent Test**: criar cinco slides com imagens, simular respostas válidas e confirmar cinco imagens aplicadas aos slides corretos com progresso de 0% a 100%.

### User Story 3 - Recuperar falhas e economizar franquia (Priority: P2)

O sistema reutiliza resultados idênticos do cache, tenta um modelo mais rápido quando o principal está temporariamente indisponível e mantém itens pendentes com uma ação de nova tentativa quando não consegue concluir.

**Independent Test**: repetir o mesmo pedido, confirmar cache sem nova chamada; simular falha transitória do modelo principal e confirmar uma única tentativa no fallback.

## Edge Cases

- Credenciais ausentes ou inválidas não iniciam a fila nem removem imagens existentes.
- Limite diário ou rate limit deixa os slides pendentes e apresenta uma mensagem específica.
- Resposta sem imagem, base64 inválido, timeout ou erro de rede não altera o slide.
- Uma imagem com texto, colagem, repetição ou baixa relação com a copy é rejeitada e pode ser regenerada com correção.
- Troca, duplicação ou exclusão de slide durante a fila não aplica uma resposta ao slide errado.
- Carrossel configurado sem imagens não inicia chamadas nem mostra progresso.

## Requirements

### Functional Requirements

- **FR-001**: O sistema MUST usar FLUX.2 Klein 4B no Workers AI como modelo principal.
- **FR-002**: O sistema MUST usar FLUX.1 Schnell como fallback controlado para falhas transitórias do modelo principal.
- **FR-003**: Account ID e token MUST ser enviados apenas ao processo principal e o token MUST ser armazenado com a criptografia segura do sistema operacional.
- **FR-004**: O renderer MUST NOT receber, persistir ou registrar o token.
- **FR-005**: O usuário MUST poder salvar, verificar, substituir e remover a configuração Cloudflare.
- **FR-006**: A geração automática MUST ocorrer somente quando imagens foram solicitadas e apenas em slides elegíveis sem imagem.
- **FR-007**: O sistema MUST gerar um prompt individual baseado na copy completa, função narrativa, direção visual e composição do slide.
- **FR-008**: Todo prompt MUST proibir texto, letras, números, logotipos, marcas-d'água, interfaces, documentos, colagens e grades.
- **FR-009**: O sistema MUST manter no máximo uma chamada de geração ativa para controlar uso e evitar travamento.
- **FR-010**: O editor MUST permanecer utilizável durante geração, auditoria, cache e novas tentativas.
- **FR-011**: O sistema MUST manter cache local limitado e reutilizar resultado somente quando modelo, prompt, dimensão e versão do pipeline coincidirem.
- **FR-012**: O usuário MUST poder ignorar o cache ao solicitar uma nova variação manualmente.
- **FR-013**: Antes de aplicar, a imagem MUST ser validada quanto a arquivo válido, texto visível, colagem, repetição visual e relação com a copy.
- **FR-014**: Uma imagem rejeitada MUST NOT substituir a imagem atual nem ser marcada como concluída.
- **FR-015**: O sistema MUST limitar autocorreções para proteger a franquia gratuita.
- **FR-016**: O progresso MUST distinguir preparação, geração, auditoria, cache, fallback, concluído, pendente e erro.
- **FR-017**: Cada imagem aplicada MUST registrar modelo, provedor, cache, duração e horário de geração.
- **FR-018**: O modelo que gerou a imagem MUST aparecer fora do canto superior direito do card.
- **FR-019**: Erros de credencial, franquia, rede, modelo e conteúdo inválido MUST ter mensagens diferentes e acionáveis.
- **FR-020**: Imagens existentes, enviadas manualmente ou aprovadas MUST NOT ser regeneradas automaticamente.
- **FR-021**: Ao salvar uma configuração Cloudflare válida, o sistema MUST persistir a credencial segura mesmo quando a sincronização de preferências estiver ativa, limpar os dois campos sensíveis, exibir o estado verde "Integração configurada" e confirmar que os campos foram limpos por segurança.

## Key Entities

- **Configuração Cloudflare**: Account ID, token criptografado, estado e data de atualização.
- **Pedido de imagem**: slide, prompt, dimensões, modelo principal, fallback, tentativa e chave de cache.
- **Resultado de imagem**: data URL, modelo, provedor, cache, duração e auditoria.
- **Item da fila**: identificador estável do slide, fase, progresso, erro e tentativas.

## Success Criteria

- **SC-001**: 100% dos testes de segurança não expõem o token no renderer, logs ou armazenamento local do navegador.
- **SC-002**: Repetir um pedido idêntico atendido pelo cache não realiza nova chamada externa.
- **SC-003**: Falha transitória do modelo principal realiza no máximo uma chamada ao fallback por tentativa.
- **SC-004**: Nenhum slide recebe a resposta destinada a outro slide em testes de troca, duplicação e exclusão.
- **SC-005**: O editor responde a navegação e edição enquanto a fila está ativa.
- **SC-006**: Carrosséis sem imagens realizam zero chamadas de geração.
- **SC-007**: Toda imagem aplicada possui procedência visível e metadados persistidos.
- **SC-008**: Entradas inválidas e respostas corrompidas nunca são aplicadas ao canvas.
- **SC-009**: Em 100% dos testes do botão de salvar com Cloudflare selecionado, o status muda para configurado, os campos ficam vazios e uma nova consulta de estado confirma a persistência local.

## Assumptions

- O usuário criará uma conta Cloudflare e fornecerá Account ID e token com Workers AI Read/Edit.
- A franquia e a disponibilidade dos modelos são controladas pela Cloudflare e podem mudar.
- O app continua oferecendo upload manual e o fluxo assistido do Ideogram como alternativas explícitas, sem acioná-los silenciosamente.
