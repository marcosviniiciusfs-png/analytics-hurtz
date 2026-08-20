# Implementation Plan: Integra 01 Dinâmico

## Summary

Composição Remotion 1440x2000 com talking head, legendas dinâmicas e três passagens editoriais: gancho tipográfico, comparação IBS/CBS e lista dos impactos, além do CTA final.

## Motion mapping

- Gancho: `type-assembly-moves`, variante A `split-text-stagger`.
- Legendas: `blur-slide`.
- Impactos: `list-reveal`.
- Transições e SFX: assets locais da video-shotcraft, com voz dominante.

## Visual direction

Paleta corporativa enxuta: azul-marinho, verde escuro, branco e vermelho apenas na tag local. Elementos em tela cheia usam fundo contínuo para impedir flashes da personagem.

## QA

Typecheck, stills dos momentos críticos, revisão de todas as fronteiras de microcena, render CRF 5, ffprobe, decodificação integral e revisão independente.
