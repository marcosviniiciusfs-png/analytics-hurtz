# Plano de implementação: Novo workspace de tarefas

## Estratégia

Refatorar somente a superfície da seção Tarefas. O estado, as chamadas da API e o modelo de dados atuais serão mantidos. A nova interface será construída sobre HTML semântico, CSS com tokens próprios e pequenas extensões no JavaScript de renderização.

## Referências aplicadas

- OpenHands: feedback imediato em ações, estado otimista com reversão e testes de interação.
- Awesome LLM Apps: separação entre estado do quadro e apresentação, com atualização bidirecional explícita.
- shadcn: anatomia de Dialog, Sheet, Dropdown Menu, Tabs, Badge, Avatar, Skeleton e Empty State.
- Tailwind UI patterns: escala consistente de espaçamento, foco acessível e adaptação responsiva.

## Arquitetura da interface

1. Cabeçalho da seção com contexto, status de retenção e ações principais.
2. Shell do quadro com cabeçalho próprio, pesquisa, alternador de visualização e filtros recolhíveis.
3. Colunas horizontais com cabeçalho fixo, corpo rolável e ação de criação fixa no rodapé.
4. Cartões com prioridade, conteúdo, etiquetas, progresso e metadados essenciais.
5. Diálogo de tarefa reorganizado em conteúdo principal, propriedades e abas de detalhes.
6. Estados de carregamento, vazio e erro compatíveis com todas as larguras.

## Compatibilidade de dados

Nenhuma tabela, endpoint ou formato de payload será alterado. Os seletores e IDs existentes permanecerão disponíveis para que os bindings atuais continuem funcionando.

## Verificação

- Validação sintática de JavaScript.
- Smoke test em navegador real com dados simulados e ações essenciais.
- Capturas e inspeção visual em desktop e mobile.
- Comparação final da implementação com esta especificação.

