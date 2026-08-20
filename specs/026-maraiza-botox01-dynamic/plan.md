# Implementation Plan: Maraiza Botox 01 Dinâmico

## Summary

Construir uma composição Remotion 1440x2560 com legendas dinâmicas e duas microcenas gráficas encadeadas. A lista adapta `list-reveal`; o valor adapta `odometer-digit-roll`. Todo movimento é determinístico por frame.

## Technical Context

- TypeScript, React e Remotion 4
- Fonte HEVC 1440x2560/30 fps e áudio AAC
- QA com TypeScript, frames-chave, ffprobe e decodificação integral
- Área informativa segura: Y=560..2000

## Structure

`Vídeo para editar/maraiza-botox01-remotion/` conterá somente fonte, assets usados e configuração. O master ficará na pasta de entregas.

## Motion and Sound

- Legendas: adaptação do blur-slide já validado, com blocos curtos.
- Três áreas: escala 0,78→1, deslocamento 14→0, leve overshoot e stagger, sobre fundo gráfico contínuo.
- Valor: roletes verticais independentes, travamento da esquerda para a direita, pulso final e entrada posterior de `12 PARCELINHAS`.
- SFX: somente assets da video-shotcraft, ligados aos marcos de entrada e mantidos abaixo da voz.

## Validation

Renderizar frames antes/durante/depois das microcenas, revisar margens e colisões, renderizar master CRF 10, validar streams, contagem de frames e decodificação integral.
