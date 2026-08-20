# Feature Specification: Maraiza Botox 01 Dinâmico

**Feature Branch**: `026-maraiza-botox01-dynamic`  
**Created**: 2026-08-14  
**Status**: Ready

## User Stories

### P1 — Acompanhar a fala

Como espectador, quero legendas brancas, curtas e sincronizadas para compreender a mensagem com facilidade.

### P1 — Memorizar áreas e preço

Como potencial cliente, quero que as três áreas e a condição de pagamento recebam tratamentos visuais próprios para reconhecer rapidamente a oferta.

## Functional Requirements

- **FR-001**: Preservar resolução 1440x2560, 30 fps, duração e áudio originais.
- **FR-002**: Usar legendas brancas com sombra leve e entradas/saídas por blur, opacidade e deslocamento, sem antecipar a fala.
- **FR-003**: Manter textos informativos e a tag dentro de Y=560..2000, equivalente à área central 1080x1080 pedida pelo usuário.
- **FR-004**: Exibir a tag vermelha `PARAUAPEBAS E REGIÃO` em branco, ocultando-a quando uma microcena exigir todo o espaço.
- **FR-005**: Destacar `3 ÁREAS`, `TESTA`, `GLABELA` e `PÉS DE GALINHA` numa microcena gráfica contínua baseada em `list-reveal` da video-shotcraft.
- **FR-006**: Apresentar `R$ 89,90` com entrada única baseada em `odometer-digit-roll`, seguida de `12 PARCELINHAS`.
- **FR-007**: Não usar cards independentes nem cobrir o rosto com textos.
- **FR-008**: Usar apenas receitas e SFX existentes na video-shotcraft.
- **FR-009**: Salvar somente o MP4 final em `Vídeo para editar/Videos Prontos/`; projeto e QA ficam fora dessa pasta.
- **FR-010**: Renderizar o master em qualidade visual máxima, CRF 10 ou superior em qualidade equivalente.
- **FR-011**: No início, durante `Essa é a oportunidade para você`, substituir a legenda comum por um gancho integrado com mão apontando em PNG transparente e texto `ESSA OPORTUNIDADE É PARA VOCÊ`.
- **FR-012**: A mão e o texto do gancho MUST entrar de baixo para cima com opacidade e blur sincronizados, sem cobrir o rosto.
- **FR-013**: O gancho MUST usar um SFX discreto da video-shotcraft e sair antes da fala seguinte.
- **FR-014**: A passagem entre a microcena das três áreas e a microcena do preço MUST permanecer integralmente gráfica, sem revelar a personagem em nenhum quadro intermediário.

## Success Criteria

- A passagem das três áreas surge no trecho falado correspondente, em ordem e com stagger legível.
- O preço termina exatamente em `R$ 89,90` e sua animação é visualmente distinta das legendas.
- Não há colisão entre legenda, tag e elementos especiais.
- O arquivo final decodifica integralmente com vídeo e áudio preservados.

## Assumptions

- Não haverá trilha musical nova; SFX discretos podem reforçar as duas microcenas sem competir com a voz.
- Correções de transcrição limitam-se a erros evidentes, como `testa`.
