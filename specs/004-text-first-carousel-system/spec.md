# Especificacao: geracao text-first e formatos distintos

**Feature Branch**: `004-text-first-carousel-system`
**Created**: 2026-08-11
**Status**: Ready

## Objetivo

Desativar a geracao de imagens por IA, acelerar a criacao e garantir que Minimalista, Profile, Creators, TechViral e Infinito tenham assinaturas visuais proprias. A copy deve partir de uma dor especifica, sustentar interesse e terminar em acao clara.

## Requisitos

- **FR-001**: A criacao automatica MUST NOT iniciar motor, fila ou auditoria de imagens.
- **FR-002**: Upload, remocao e recorte manual de imagens MUST continuar disponiveis.
- **FR-003**: O botao de gerar imagem do slide MUST ser ocultado enquanto o modo text-first estiver ativo.
- **FR-004**: Minimalista, Profile, Creators, TechViral e Infinito MUST possuir combinacoes distintas de layout, tipografia, paleta, ritmo e variacao entre hook, corpo e CTA.
- **FR-005**: Slides de um mesmo formato MUST NOT parecer uma sequencia de capas identicas.
- **FR-006**: O briefing de copy MUST identificar assunto, dor concreta, consequencia, desejo e acao sem trocar o objetivo do usuario.
- **FR-007**: Copy explicitamente fechada MUST continuar literal.
- **FR-008**: A ferramenta Cantos MUST oferecer cor editavel e codigo hexadecimal copiavel.
- **FR-009**: Interacoes de botoes MUST evitar filtros e transformacoes globais que provoquem repintura cara.

## Criterios de sucesso

- Nenhum teste de geracao text-first chama o motor de imagens.
- Os cinco formatos produzem assinaturas diferentes.
- Cada formato alterna ao menos tres composicoes entre hook, corpo e CTA em um carrossel de cinco slides.
- A cor dos cantos aparece no canvas e persiste ao trocar de slide.
- Botoes mantem hover, clique e foco com transicoes leves.
