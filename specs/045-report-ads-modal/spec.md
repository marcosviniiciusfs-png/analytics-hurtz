# Especificação: anúncios do relatório em modal por conta

## Objetivo

Manter o relatório auditado compacto, sem carregar as imagens dos anúncios diretamente no corpo de cada conta.

## Requisitos funcionais

- Cada conta exibida no relatório deve ter um botão azul com o texto `Visualizar anúncios`.
- O botão deve abrir um modal exclusivo para a conta selecionada.
- O modal deve listar somente anúncios daquela conta, com gasto no período auditado do relatório.
- A lista deve preservar prévia, ampliação, edição de textos de apresentação, restauração e download individual.
- O corpo do relatório não deve conter a seção expandida de anúncios.
- Se a conta não tiver anúncios no período, o modal deve exibir um estado vazio claro.
- O modal deve fechar pelo botão, pela tecla Escape e pelo clique fora do painel.
- O foco deve retornar ao botão que abriu o modal.

## Requisitos não funcionais

- As imagens devem usar carregamento tardio e só devem ser inseridas no DOM quando o modal for aberto.
- A seleção de anúncios deve permanecer vinculada ao ID da conta e ao período já auditado.
- O modal deve ser responsivo, acessível e ter rolagem interna.
- Nenhum dado auditado recebido da Meta deve ser alterado.

## Critérios de aceite

1. Após criar o relatório, nenhuma prévia de anúncio aparece aberta no corpo da página.
2. Cada conta tem um botão azul `Visualizar anúncios`.
3. O botão de uma conta nunca mostra anúncios de outra conta.
4. Fechar e reabrir o modal mantém o relatório compacto e não duplica conteúdo.
5. As ações existentes dos anúncios continuam funcionando dentro do modal.

