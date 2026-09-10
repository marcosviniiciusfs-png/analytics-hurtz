# Especificação: Novo workspace de tarefas

**Feature**: `057-taskronic-tasks-ui`  
**Status**: Pronto para implementação  
**Data**: 2026-09-09

## Objetivo

Transformar a seção Tarefas do Analytics Hurtz em um workspace de gestão visual claro, rápido e agradável, inspirado nas boas práticas observadas no Taskronic, sem copiar seu código e sem substituir a infraestrutura atual do Analytics.

## Contexto

A seção atual oferece quadro, lista, calendário, resumo, filtros, tarefas, etapas configuráveis e detalhes avançados. Porém, o acúmulo de estilos e controles deixa a interface pesada, fragmentada e pouco intuitiva. O novo desenho deve organizar essas funções por importância e tornar as ações principais imediatamente reconhecíveis.

## Jornadas prioritárias

### P1 — Entender e operar o quadro

Ao entrar em Tarefas, o usuário identifica o quadro ativo, o total de tarefas, os alertas importantes e as ações principais. Ele encontra, cria, abre e move cartões sem precisar aprender a interface.

**Aceite**:

1. O quadro apresenta colunas com cabeçalho, função, quantidade e menu de configuração claros.
2. Cada coluna aceita quantidade ilimitada de cartões e mantém rolagem vertical utilizável.
3. O usuário adiciona uma tarefa pelo botão principal ou diretamente em uma etapa.
4. O cartão permanece visualmente opaco durante o arraste e o destino recebe feedback visível.
5. Cartões concluídos e etapas de conclusão usam tratamento verde e preservam a celebração já existente.

### P1 — Encontrar e filtrar trabalho

O usuário alterna entre quadro, lista, calendário e resumo, pesquisa tarefas e abre filtros sem ocupar permanentemente grande parte da tela.

**Aceite**:

1. Pesquisa e alternador de visualização ficam sempre acessíveis.
2. Filtros avançados ficam agrupados em um painel compacto e indicam quantos estão ativos.
3. Limpar todos os filtros exige uma única ação.
4. O resultado filtrado e o total geral são comunicados sem ambiguidade.

### P1 — Editar uma tarefa

Ao abrir uma tarefa, o usuário vê título, descrição e propriedades em uma hierarquia simples, além de checklist, comentários, anexos e histórico.

**Aceite**:

1. O diálogo é amplo no desktop e ocupa a tela de forma adequada no celular.
2. Campos principais e propriedades secundárias são visualmente separados.
3. Fechar, salvar e excluir têm estados e posições previsíveis.
4. A navegação por teclado, foco visível e rótulos acessíveis são preservados.

### P2 — Trabalhar em telas menores

O usuário consegue operar a seção a partir de celular ou tablet sem controles cortados ou sobrepostos.

**Aceite**:

1. Em telas pequenas, ações secundárias e filtros se reorganizam sem overflow da página.
2. O quadro mantém rolagem horizontal intencional e colunas com largura confortável.
3. Diálogos não ultrapassam a viewport e seu conteúdo permanece rolável.

## Requisitos funcionais

- **RF-001**: Preservar todas as tarefas e estruturas existentes no Supabase.
- **RF-002**: Preservar criação, edição, exclusão, ordenação e movimentação de tarefas.
- **RF-003**: Preservar etapas editáveis, papéis de etapa e criação de novas etapas.
- **RF-004**: Preservar projetos, módulos, ciclos, responsáveis, prioridades, etiquetas, prazo e estimativa.
- **RF-005**: Preservar lista, calendário e resumo.
- **RF-006**: Preservar checklist, comentários, anexos, histórico e menções.
- **RF-007**: Exibir aviso inequívoco de que tarefas e arquivos são apagados permanentemente após 72 horas.
- **RF-008**: Exibir tempo restante no cartão quando disponível.
- **RF-009**: Permitir ocultar e exibir filtros avançados.
- **RF-010**: Permitir limpar filtros ativos em uma ação.
- **RF-011**: Exibir skeleton durante a primeira carga quando não houver cache local.
- **RF-012**: Exibir estados vazios e de erro com orientação acionável.

## Requisitos de experiência

- **RX-001**: Usar a identidade Hurtz e não reproduzir a identidade visual do Taskronic.
- **RX-002**: Manter uma hierarquia de três níveis: cabeçalho da seção, barra do quadro e conteúdo.
- **RX-003**: Usar componentes consistentes para botões, campos, badges, cartões, menus e diálogos.
- **RX-004**: Reduzir ruído visual; controles raros devem permanecer recolhidos até serem solicitados.
- **RX-005**: Cartões devem ser legíveis sem desperdiçar espaço e mostrar apenas metadados relevantes.
- **RX-006**: Respeitar `prefers-reduced-motion`.
- **RX-007**: Controles interativos devem ter alvo mínimo próximo de 40 px e foco visível.

## Restrições e decisões

- A implementação permanece no frontend atual em HTML, CSS e JavaScript, utilizando as APIs existentes.
- Não será adicionada dependência do Taskronic, Convex, React, Next.js ou outro runtime.
- Nenhum código do repositório Taskronic será copiado por ausência de licença explícita.
- A política atual de exclusão permanente em 72 horas não será alterada.
- Mudanças no banco e na API não fazem parte deste redesenho, salvo correção indispensável descoberta nos testes.

## Critérios mensuráveis de sucesso

- **CS-001**: O primeiro conteúdo útil aparece imediatamente a partir do cache ou como skeleton até a resposta da API.
- **CS-002**: Criar uma tarefa em uma etapa exige no máximo duas ações antes da digitação.
- **CS-003**: Com 10 ou mais tarefas na mesma etapa, todos os cartões continuam acessíveis por rolagem interna.
- **CS-004**: O quadro funciona sem sobreposição em 1440 px, 1024 px, 768 px e 390 px.
- **CS-005**: Não há perda de funcionalidade nos quatro modos de visualização.
- **CS-006**: O JavaScript passa por validação sintática e o smoke test do navegador valida carregamento, filtros, visualizações e abertura do formulário.

## Fora do escopo

- Migração para a stack do Taskronic.
- Sistema separado ou autenticação própria para tarefas.
- Alteração da política de retenção.
- Novas automações de backend ou integrações externas.

## Revisão de coerência — 2026-09-10

- A criação de tarefas deve existir somente dentro das etapas; o botão global duplicado será removido.
- Menções devem exibir exatamente um contador, correspondente às notificações não lidas.
- A ação do cabeçalho passa a se chamar **Etapas**, refletindo sua função principal.
- O modal deve abrir diretamente no gerenciamento de etapas. Projetos, módulos e ciclos são opcionais e ficam em uma área avançada separada.
- Módulos e ciclos só podem ser criados quando existir um projeto, com estado desabilitado e explicação clara caso contrário.
- Reordenar, editar e excluir etapas deve usar a configuração própria da etapa, sem ações duplicadas ou prompts improvisados.
