# Especificação: Projetos colaborativos de tarefas

**Feature**: `058-collaborative-task-workspaces`  
**Status**: Em implementação  
**Data**: 2026-09-10

## Objetivo

Permitir que usuários autenticados criem projetos colaborativos independentes, convidem outros usuários do Analytics por um identificador público e controlem o acesso ao quadro de tarefas com permissões simples e seguras.

## Definição de produto

Na interface, o recurso será chamado **Projetos**. Cada projeto representa um workspace completo e isolado, contendo suas próprias etapas, tarefas, comentários, anexos, histórico e menções. Ele não corresponde aos antigos campos de projeto, módulo ou ciclo removidos do formulário de tarefa.

## Jornadas prioritárias

### P1 — Identidade pública

Cada conta autenticada recebe automaticamente um ID público único e imutável no formato `HZ-XXXX-XXXX`. O ID aparece na parte inferior da barra lateral e pode ser copiado. O UUID interno de autenticação nunca é exibido.

### P1 — Criar e alternar projetos

O usuário abre **Projetos**, cria um workspace com nome e descrição e alterna entre projetos dos quais participa. O último projeto utilizado é lembrado por navegador.

### P1 — Convidar membros

Proprietários e administradores pesquisam um usuário pelo ID público, escolhem o papel e enviam um convite. O destinatário precisa aceitar antes de acessar o projeto.

### P1 — Autorizar ações

Toda leitura e mutação de tarefas é validada no servidor contra o projeto atual e a associação do usuário. Esconder botões na interface não substitui a autorização do servidor.

## Papéis e permissões

| Ação | Proprietário | Administrador | Membro | Visualizador |
|---|---:|---:|---:|---:|
| Ver quadro e detalhes | Sim | Sim | Sim | Sim |
| Criar, editar e mover tarefas | Sim | Sim | Sim | Não |
| Comentar e concluir checklist | Sim | Sim | Sim | Não |
| Criar e configurar etapas | Sim | Sim | Não | Não |
| Convidar e remover membros | Sim | Sim | Não | Não |
| Alterar papéis | Sim | Sim, exceto proprietário | Não | Não |
| Renomear projeto | Sim | Sim | Não | Não |
| Excluir projeto ou transferir propriedade | Sim | Não | Não | Não |

## Requisitos funcionais

- **RF-001**: Criar perfil colaborativo automaticamente no primeiro acesso autenticado.
- **RF-002**: Gerar ID público aleatório, único e não sequencial.
- **RF-003**: Criar um projeto pessoal padrão para novos usuários.
- **RF-004**: Listar somente projetos dos quais o usuário é membro ativo.
- **RF-005**: Isolar etapas, tarefas e todos os dados derivados por projeto.
- **RF-006**: Permitir criar, renomear e alternar projetos.
- **RF-007**: Permitir convite pendente por ID público, com aceite ou recusa.
- **RF-008**: Impedir convites duplicados e auto convite.
- **RF-009**: Permitir alteração de papel e remoção conforme a matriz de permissões.
- **RF-010**: Não permitir remover o proprietário nem deixar um projeto sem proprietário.
- **RF-011**: Limitar menções aos membros ativos do projeto atual.
- **RF-012**: Manter a política de exclusão permanente de tarefas após 72 horas.
- **RF-013**: Preservar dados legados durante a migração.
- **RF-014**: Mostrar claramente o papel do usuário no projeto atual.
- **RF-015**: Visualizadores devem receber interface somente leitura e respostas 403 ao tentar mutações.

## Requisitos de segurança

- IDs públicos não concedem acesso por si só.
- Convites precisam de aceite explícito.
- E-mails de outros usuários não são retornados pela API de membros.
- O servidor usa o ID da sessão validada; nenhum `user_id` enviado pelo navegador é confiável.
- Todas as consultas usam `workspace_id` validado.
- Operações de proprietário e administrador são verificadas novamente no servidor.
- Respostas de acesso negado não devem revelar a existência de projetos privados.

## Experiência

- O botão **Projetos** aparece ao lado de **Menções**.
- O modal de projetos possui três áreas: Meus projetos, Membros e Convites.
- Estados vazios explicam a próxima ação.
- O ID público na barra lateral possui botão de copiar e confirmação discreta.
- No celular, o modal ocupa a tela e mantém ações essenciais acessíveis.

## Migração

- As tabelas atuais recebem `workspace_id` sem apagar registros.
- Registros legados são vinculados a um workspace de migração.
- O primeiro administrador autenticado que acessar o recurso pode assumir o workspace legado; usuários seguintes recebem projeto pessoal próprio.
- A implantação do backend e da migração deve preceder a publicação da interface.

## Critérios de sucesso

- Dois usuários diferentes não conseguem ler projetos sem associação.
- Um convite pendente não concede acesso.
- Cada papel passa pelos testes positivos e negativos da matriz.
- Alternar projeto troca todo o quadro sem misturar cartões.
- O ID público pode ser copiado no desktop e no celular.
- O fluxo de quadro existente continua funcional para proprietário, administrador e membro.

## Decisões assumidas

- Convites serão feitos pelo ID público, não por e-mail.
- Convites exigem aceite.
- Os quatro papéis definidos nesta especificação serão usados inicialmente.
- Não haverá chat, times globais nem compartilhamento público por link nesta versão.

