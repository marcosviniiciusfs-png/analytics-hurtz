# Plano: Projetos colaborativos de tarefas

## Dados

Criar perfis públicos, workspaces, associações e convites. Adicionar `workspace_id` às estruturas do quadro e índices para consultas frequentes. Manter acesso exclusivo pelo backend com service role e validação de sessão.

## Backend

Adicionar contexto de usuário às rotas de tarefas. Criar endpoints de contexto, projetos, convites e membros. Centralizar resolução do projeto atual e verificação de papel. Aplicar o escopo em todas as leituras e mutações do quadro.

## Frontend

Adicionar identidade pública na barra lateral, seletor/botão de projetos, modal colaborativo, indicadores de papel e estados de convite. Enviar o projeto ativo em todas as chamadas de tarefas e aplicar modo somente leitura.

## Verificação

Testes de navegador com dois usuários, testes de autorização por papel, validação de isolamento, criação/aceite de convite, troca de projeto e regressão do quadro existente.

