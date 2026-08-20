# Plano de implementação

1. Auditar wrappers e elementos adicionados na otimização recente.
2. Criar controles sobre `titleX`, `titleY`, `bodyX` e `bodyY`.
3. Remover somente a grade de presets e preservar o alinhamento.
4. Corrigir vazamentos de estado, ações manuais de imagem e contraste.
5. Adicionar teste de DOM, executar a suíte e empacotar.
6. Ocultar os controles genéricos sem removê-los do DOM, preservando a sincronização interna.
7. Reestruturar as ações de imagem em botões irmãos independentes.

## Arquivos

- `Hurtz Flow Studio/app.js`
- `Hurtz Flow Studio/product-ui.css`
- `Hurtz Flow Studio/scripts/title-subtitle-position-e2e-test.js`
- `Hurtz Flow Studio/package.json`
## Phase 5 — Cores consistentes

Centralizar a interação dos seletores em um componente próprio, separar o estado de destaque de título e corpo e garantir que todos os renderizadores consumam as propriedades corretas. Validar o resultado no DOM e no canvas.
## Phase 6 — Execução manual de imagens

Adicionar uma barreira final no pipeline que neutralize filas automáticas, invalide trabalhos antigos e normalize projetos carregados. Manter somente o botão por slide como ponto de entrada da geração.
## Phase 7 — Identidade posicional das palavras

Representar seleções novas por índice de token dentro do campo. Renderizar título e texto com os respectivos índices, preservar a ordem e manter leitura compatível com seleções legadas.
