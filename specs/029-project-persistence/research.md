# Research: Persistência integral dos projetos

## Arquivo atômico como fonte local durável

- **Decisão**: gravar `project-store-v1.json` em `userData`, primeiro em arquivo temporário e depois renomear.
- **Motivo**: localStorage tem limite e `hurtz-current` não atualiza necessariamente `hurtz-projects`.
- **Rejeitado**: somente localStorage ou somente Supabase.

## Restauração antes do editor

- **Decisão**: leitura IPC síncrona apenas no bootstrap, antes de `app.js`.
- **Motivo**: impede migrações destrutivas antes da restauração.

## Autosave identificado

- **Decisão**: após receber `id`, toda chamada de `save()` atualiza a entrada correspondente e agenda persistência durável.
- **Motivo**: preserva edições posteriores ao primeiro salvamento.

## Restauração passiva

- **Decisão**: cancelar jobs em memória e converter status transitórios para `paused`, sem remover mídia, texto ou direção visual.
- **Motivo**: job antigo é histórico, não autorização de geração.

## Supabase como réplica

- **Decisão**: mesclar remoto/local por `updated`, preservando o mais recente; não salvar o estado corrente durante o boot.
- **Motivo**: a rede não pode substituir a cópia local correta.
