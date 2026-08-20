# Research: Isolamento de copy e formatos

## Decision 1: Tratar cada geração como uma execução isolada

**Decision**: Criar uma identidade de execução e snapshot imutável antes da primeira chamada de copy; callbacks posteriores verificam essa identidade.

**Rationale**: O código atual possui várias camadas de wrappers e estado global. Um snapshot impede que formato, prompt ou projeto alterados durante chamadas assíncronas contaminem a resposta.

**Alternatives considered**: Apenas limpar o cache ao abrir o modal não protege contra respostas assíncronas antigas nem globals de formato.

## Decision 2: Validar conteúdo integral nas entradas do cache

**Decision**: Uma entrada deve guardar assinatura forte, pedido integral e versão do pipeline. Geração criativa de um novo projeto usa política sem cache; cache permanece disponível para operações auxiliares idênticas.

**Rationale**: O cache atual usa somente um hash curto como chave e não confirma o prompt armazenado. Isso permite retorno incorreto em colisões e dificulta invalidar versões antigas.

**Alternatives considered**: Aumentar apenas o tempo de validade não resolve correspondência nem isolamento. Remover todo cache também eliminaria otimizações seguras das auditorias.

## Decision 3: Fallback derivado do pedido, não catálogo genérico

**Decision**: A recuperação determinística usa linhas e fatos do prompt atual, com uma progressão ligada ao formato e aos papéis Hook–Corpo–CTA.

**Rationale**: A fraseologia fixa atual reproduz exatamente o erro da captura do usuário e esconde a causa real da falha local.

**Alternatives considered**: Manter o catálogo e apenas inserir o assunto gera texto superficial e repetitivo.

## Decision 4: Formato explícito vence estado global

**Decision**: Normalizar a escolha recebida e utilizá-la como fonte de verdade em toda construção e reconstrução; `wizardTemplateStyle` serve apenas para a interface antes do snapshot.

**Rationale**: Globals antigos podem sobreviver à troca de projeto. O argumento da execução é a intenção atual verificável.

**Alternatives considered**: Limpar globals ao fechar o modal reduz o risco, mas não protege chamadas de outras entradas nem reconstruções.

## Decision 5: Testar com gerador simulado e renderer real

**Decision**: Cobrir isolamento e fallback com teste determinístico de Node e cobrir matriz de formatos no Electron por CDP/Playwright.

**Rationale**: O bug envolve tanto regras puras quanto a cadeia real de wrappers carregada no renderer.

**Alternatives considered**: Teste exclusivamente visual é lento e dependente do Ollama; teste exclusivamente estático não detecta sobrescritas tardias do legado.
