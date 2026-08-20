# Especificacao: overlay independente e botoes responsivos

**Feature Branch**: `003-overlay-button-feedback`
**Created**: 2026-08-11
**Status**: Ready

## Cenarios

### Overlay sem imagem (P1)

Como usuario, quero manter a sombra ou overlay do slide mesmo depois de remover a imagem.

1. Dado um slide sem imagem, quando o overlay estiver ativo, entao ele deve cobrir fundo e textura.
2. Dado qualquer slide, o overlay deve ser pintado depois dos elementos visuais e antes dos textos, badge, cantos, CTA e indicadores.
3. Remover ou substituir uma imagem nao deve alterar as configuracoes do overlay.

### Resposta visual dos botoes (P2)

Como usuario, quero identificar controles clicaveis e receber uma resposta suave ao clicar.

1. Botoes habilitados exibem cursor de clique e mudanca visual no hover.
2. O pressionamento produz resposta curta sem deslocar o layout.
3. Foco por teclado e estado desabilitado continuam claros.
4. A animacao respeita `prefers-reduced-motion`.

## Requisitos

- **FR-001**: O overlay MUST ser independente da existencia da imagem.
- **FR-002**: A ordem MUST ser fundo/padrao/imagem, overlay, conteudo textual e acessorios.
- **FR-003**: Falha ao carregar imagem MUST preservar o overlay.
- **FR-004**: Todos os elementos `button` habilitados MUST ter hover, cursor e pressionamento consistentes.
- **FR-005**: Botoes desabilitados MUST NOT aparentar interacao.
- **FR-006**: A mudanca MUST possuir teste Electron para ordem das camadas e feedback dos botoes.

## Criterios de sucesso

- Overlay e detectado em 100% dos testes com imagem, sem imagem e com erro de imagem.
- O overlay sempre ocorre antes da camada de conteudo.
- Botoes reais possuem cursor, transicao, foco e estado ativo sem regressao nos controles existentes.
