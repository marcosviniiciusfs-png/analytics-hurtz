# Implementation Plan: Gerenciar linhas de campanhas no PNG

## Summary

Completar o editor visual de relatórios PNG com inclusão e remoção de grupos de campanha, preservando por conta as edições temporárias e mantendo a restauração dos dados auditados.

## Technical Context

- Aplicação web estática com JavaScript e canvas.
- Estado temporário por conta já mantido no mapa de edições do relatório.
- Arquivos afetados: `Dashboard Meta Ads/app.js`, `Dashboard Meta Ads/brand-overrides.css`, `Dashboard Meta Ads/index.html`.
- Nenhuma alteração de API ou banco de dados.

## Constitution Check

- Constituição não configurada (template); verificação ignorada.
- Regra do workspace: dados auditados permanecem imutáveis e separados das edições da arte.

## Design

1. Acrescentar ação “Adicionar campanha” ao final do editor de grupos.
2. Inserir um objeto editável vazio na coleção temporária da conta atual.
3. Reutilizar a renderização e atualização do canvas existentes.
4. Manter a remoção individual já implementada e garantir restauração total.
5. Estilizar a ação para ser clara, compacta e responsiva.

## Validation

- Validar sintaxe JavaScript.
- Verificar ausência de erros de whitespace.
- Confirmar por inspeção que adicionar/remover manipula somente `edit.groups`.
- Confirmar que restaurar apaga a edição temporária e recria os grupos auditados.
