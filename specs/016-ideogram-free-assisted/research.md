# Research: Fluxo gratuito assistido do Ideogram

## Decision 1: fluxo assistido, não automação do site

- **Decision**: abrir o endereço oficial após ação explícita e deixar login, geração e download sob controle do usuário.
- **Rationale**: preserva o fluxo gratuito sem depender de uma API paga, não contorna limites e não depende da estrutura interna mutável do site.
- **Alternatives considered**: automação do navegador, rejeitada por fragilidade e risco de violar regras do serviço; execução local, rejeitada como principal porque o modelo oficial excede a VRAM disponível.

## Decision 2: monitor híbrido com estabilidade de arquivo

- **Decision**: usar notificação do filesystem combinada com verificação periódica curta e exigir tamanho estável antes da leitura.
- **Rationale**: eventos de filesystem podem ser agregados ou perdidos; a verificação periódica recupera esses casos, e a estabilidade evita ler um download incompleto.
- **Alternatives considered**: polling contínuo de toda a pasta, rejeitado por trabalho desnecessário; apenas notificação do filesystem, rejeitada por baixa confiabilidade isolada.

## Decision 3: vínculo por ID persistente do slide

- **Decision**: assegurar um `id` em cada slide e armazenar esse ID na sessão.
- **Rationale**: índice muda ao duplicar, apagar ou reorganizar cards. O ID impede que o download vá para o slide atualmente selecionado ou para outro índice.
- **Alternatives considered**: índice atual, rejeitado por associação incorreta após navegação e reordenação.

## Decision 4: um monitor ativo e fila no renderer

- **Decision**: permitir uma sessão de download por vez e manter a fila no estado do carrossel.
- **Rationale**: o site gratuito já exige uma ação humana por imagem. Paralelizar monitores tornaria impossível saber qual download pertence a qual slide.
- **Alternatives considered**: vários monitores simultâneos, rejeitados por ambiguidade de associação.

## Decision 5: interface nativa coerente com shadcn

- **Decision**: compor diálogo com cabeçalho, descrição, progresso, conteúdo, alerta e rodapé; botões têm loading, foco, hover, disabled e cancelamento explícitos.
- **Rationale**: o projeto é HTML/CSS nativo, então instalar React/Tailwind seria regressivo. A anatomia shadcn e os tokens visuais existentes são suficientes.
- **Alternatives considered**: adicionar framework de componentes, rejeitado por peso e incompatibilidade com a base atual.
