# Feature Specification: Integra 01 Dinâmico

**Feature Branch**: `027-integra01-dynamic`  
**Created**: 2026-08-14  
**Status**: Ready

## User stories

### P1: compreender IBS e CBS

O espectador identifica rapidamente o significado e a esfera de competência dos dois novos tributos.

### P1: entender o impacto no negócio

O empresário reconhece os processos afetados e entende que precisa se preparar.

### P2: continuar acompanhando

O CTA final orienta o espectador a seguir o perfil para acompanhar os próximos vídeos.

## Functional requirements

- **FR-001**: Usar `Vídeo para editar/integra 01.mp4`, preservando fala, duração e enquadramento 1440x2000 a 30 fps.
- **FR-002**: Criar legendas brancas com sombra, blocos curtos e entrada/saída por blur, opacidade e deslocamento, sem antecipar a fala.
- **FR-003**: Manter informações principais dentro da área central quadrada Y=280..1720.
- **FR-004**: Exibir a tag vermelha `PARAUAPEBAS` em branco quando não houver microcena em tela cheia.
- **FR-005**: Criar um gancho inicial para `IBS` e `CBS` sem cobrir o rosto.
- **FR-006**: Criar microcena contínua explicando `CBS: FEDERAL` e `IBS: ESTADUAL + MUNICIPAL`.
- **FR-007**: Criar microcena para `PROCESSOS FISCAIS`, `DOCUMENTOS`, `CRÉDITOS TRIBUTÁRIOS` e `FORMAÇÃO DO PREÇO`, com entradas separadas e harmônicas.
- **FR-008**: Criar CTA final `SIGA E ACOMPANHE OS PRÓXIMOS VÍDEOS` com animação própria.
- **FR-009**: Ocultar tag e legendas durante microcenas; não revelar a personagem entre cenas gráficas consecutivas.
- **FR-010**: Usar exclusivamente movimentos e SFX da video-shotcraft; nenhum som de clique sem ação visual de clique.
- **FR-011**: Renderizar MP4 final em alta qualidade e salvar somente em `Vídeo para editar/Videos Prontos/`.
- **FR-012**: Manter projeto editável e QA fora da pasta de entregas.

## Success criteria

- A explicação visual de IBS/CBS acompanha a fala de 5,58 a 12,78 s.
- A lista de impactos acompanha a fala de 24,62 a 30,94 s.
- Nenhum texto cobre olhos ou boca e não há sobreposição entre tag, legenda e efeitos.
- O master decodifica integralmente, com 1412 frames e áudio audível.
